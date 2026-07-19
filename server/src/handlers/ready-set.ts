import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/**
 * Human ready confirmation (`explicit-participant-readiness`,
 * infrastructure.md Start Negotiation): flips the sender's readiness
 * `loaded → ready` (ready: true) or `ready → loaded` (ready: false) and
 * broadcasts `session-state`. Rejected while the participant isn't in a
 * ready-able state (`no-part`/`loading`) — there's nothing loaded to
 * confirm yet.
 */
export function handleReadySet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'ready-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  const participant = session.participants.find((p) => p.id === conn.participantId);
  if (!participant) return;

  if (participant.readiness === 'no-part' || participant.readiness === 'loading') {
    ctx.connections.send(socket, { type: 'error', message: 'Cannot confirm readiness before loading finishes' });
    return;
  }

  participant.readiness = message.ready ? 'ready' : 'loaded';
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
