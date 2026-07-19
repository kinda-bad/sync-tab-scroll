import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { resolvePendingStart, runStartFlow } from './playback-control.js';

/**
 * The host's answer to `start-confirmation-needed` (infrastructure.md Start
 * Negotiation): proceed → the normal start flow runs and the pending
 * participants get `host-start-resolved { started: true }`; cancel →
 * nothing starts, resolved `started: false`. Any `ready-set` answers given
 * during the window persist regardless of outcome — they were ordinary
 * readiness changes, not part of the negotiation.
 */
export function handleStartConfirmationAnswer(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'start-confirmation-answer' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can answer a start confirmation' });
    return;
  }
  if (!ctx.sessionStore.getPendingStart(session.code)) {
    ctx.connections.send(socket, { type: 'error', message: 'No start confirmation is pending' });
    return;
  }

  resolvePendingStart(ctx, session, message.proceed);
  if (!message.proceed) return;

  runStartFlow(session);
  session.playbackState.serverTimestamp = Date.now();
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
