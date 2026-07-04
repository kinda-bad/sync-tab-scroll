import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

export function handleHostRequestDecline(ctx: HandlerContext, socket: WebSocket, _message: Extract<ClientMessage, { type: 'host-request-decline' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can decline a host request' });
    return;
  }

  if (session.pendingHostRequest === null) {
    ctx.connections.send(socket, { type: 'error', message: 'No host request is pending' });
    return;
  }

  session.pendingHostRequest = null;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
