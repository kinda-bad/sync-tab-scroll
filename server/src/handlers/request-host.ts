import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

export function handleRequestHost(ctx: HandlerContext, socket: WebSocket, _message: Extract<ClientMessage, { type: 'request-host' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId === conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'You are already the host' });
    return;
  }

  if (session.pendingHostRequest !== null) {
    ctx.connections.send(socket, { type: 'error', message: 'A host request is already pending' });
    return;
  }

  session.pendingHostRequest = conn.participantId;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
