import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { resolvePendingStart, runStartFlow } from './playback-control.js';

/**
 * Human ready confirmation (`explicit-participant-readiness`,
 * infrastructure.md Start Negotiation): flips the sender's readiness
 * `loaded → ready` (ready: true) or `ready → loaded` (ready: false) and
 * broadcasts `session-state`. Rejected while the participant isn't in a
 * ready-able state (`no-part`/`loading`) — there's nothing loaded to
 * confirm yet.
 *
 * If this ready-up brings an open start negotiation's not-ready count to
 * zero (every pending participant is now ready or disconnected), the
 * negotiation auto-resolves exactly as if the host had answered "start
 * anyway" — the host's stale confirmation modal shouldn't sit open once
 * there's nothing left to confirm.
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

  const pending = ctx.sessionStore.getPendingStart(session.code);
  if (pending) {
    const stillNotReady = pending.filter((id) => {
      const p = session.participants.find((sp) => sp.id === id);
      return p && p.connectionStatus === 'connected' && p.readiness !== 'ready';
    });
    if (stillNotReady.length === 0) {
      resolvePendingStart(ctx, session, true);
      runStartFlow(session);
    }
  }

  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
