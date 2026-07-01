import { WebSocketServer } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { ServerConfig } from './config.js';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import { loadCatalog } from './catalog-loader.js';
import { dispatch } from './dispatch.js';
import type { HandlerContext } from './handlers/context.js';

const BROADCAST_INTERVAL_MS = 1000;

export function createServer(config: ServerConfig): WebSocketServer {
  const ctx: HandlerContext = {
    sessionStore: new SessionStore(),
    connections: new ConnectionRegistry(),
    catalog: loadCatalog(config.catalogRoot),
  };

  const wss = new WebSocketServer({ port: config.port });

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
