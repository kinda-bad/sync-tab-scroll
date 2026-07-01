import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

export function handlePartSelect(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'part-select' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  const participant = session.participants.find((p) => p.id === conn.participantId);
  if (!participant) return;

  participant.selectedPart = message.part;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
