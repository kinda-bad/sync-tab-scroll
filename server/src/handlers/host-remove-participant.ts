import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

export function handleHostRemoveParticipant(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'host-remove-participant' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can remove participants' });
    return;
  }

  session.participants = session.participants.filter((p) => p.id !== message.participantId);
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
