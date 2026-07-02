import * as http from 'node:http';
import { WebSocketServer } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { ServerConfig } from './config.js';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import { loadCatalog } from './catalog-loader.js';
import { createCatalogRequestHandler } from './catalog-static.js';
import { dispatch } from './dispatch.js';
import { promoteNextHost } from './host-succession.js';
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
      const session = ctx.sessionStore.get(conn.sessionCode);
      const participant = session?.participants.find((p) => p.id === conn.participantId);
      if (participant) participant.connectionStatus = 'disconnected';
      ctx.sessionStore.markPossiblyEmpty(conn.sessionCode);

      // Let remaining participants see the disconnect immediately (stale
      // connectivity info otherwise persisted until some other broadcast
      // happened to fire) — detach() above already removed this socket
      // from the registry, so it only reaches those still connected.
      if (session) {
        ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
      }

      // Host disconnecting starts the succession grace period (infrastructure.md
      // Host Succession) — cancelled if they reconnect within it (session-join.ts).
      if (session && conn.participantId === session.hostId) {
        ctx.sessionStore.scheduleHostReassignment(conn.sessionCode, () => promoteNextHost(ctx, conn.sessionCode));
      }
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
