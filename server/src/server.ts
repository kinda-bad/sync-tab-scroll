import * as http from 'node:http';
import { WebSocketServer } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { ServerConfig } from './config.js';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import { loadCatalog } from './catalog-loader.js';
import { createCatalogRequestHandler } from './catalog-static.js';
import { dispatch } from './dispatch.js';
import { handleDisconnect } from './disconnect.js';
import type { HandlerContext } from './handlers/context.js';

const BROADCAST_INTERVAL_MS = 1000;

export function createServer(config: ServerConfig): WebSocketServer {
  const ctx: HandlerContext = {
    sessionStore: new SessionStore(config.hostReassignGraceMs),
    connections: new ConnectionRegistry(),
    catalog: loadCatalog(config.catalogRoot),
  };

  // WS upgrade and the catalog's static-file serving share one http.Server
  // (infrastructure.md "Song Catalog Delivery") instead of running as two
  // separate listeners on two ports.
  const catalogHandler = createCatalogRequestHandler(config.catalogRoot);
  const httpServer = http.createServer((req, res) => {
    if (!catalogHandler(req, res)) res.writeHead(404).end();
  });
  httpServer.listen(config.port);

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(data.toString());
      } catch {
        ctx.connections.send(socket, { type: 'error', message: 'Malformed message' });
        return;
      }
      dispatch(ctx, socket, message);
    });

    socket.on('close', () => {
      const conn = ctx.connections.detach(socket);
      if (!conn) return;
      // Let remaining participants see the disconnect immediately (stale
      // connectivity info otherwise persisted until some other broadcast
      // happened to fire), clear a pending host request if it was theirs,
      // and start the host-succession grace period if they were the host
      // (infrastructure.md Host Succession/Host Transfer) — detach() above
      // already removed this socket from the registry, so the broadcast
      // only reaches those still connected.
      handleDisconnect(ctx, conn.sessionCode, conn.participantId);
    });
  });

  setInterval(() => {
    // Periodic PlaybackState broadcast for running sessions — each client
    // uses this to correct its own alphaTab instance's drift, rather than
    // being continuously driven by the server (infrastructure.md).
    for (const session of ctx.sessionStore.all()) {
      if (session.playbackState.status !== 'running') continue;
      session.playbackState.serverTimestamp = Date.now();
      ctx.connections.broadcast(session.code, (selfParticipantId) => ({
        type: 'session-state',
        session,
        selfParticipantId,
      }));
    }
  }, BROADCAST_INTERVAL_MS);

  return wss;
}
