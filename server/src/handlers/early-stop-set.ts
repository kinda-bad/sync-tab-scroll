import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/** Host-only early-stop tick point (ui.md "Early stop point" control) — same pattern as spotlight-mode-set.ts. */
export function handleEarlyStopSet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'early-stop-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can set the early-stop point' });
    return;
  }

  session.earlyStopTick = message.tickPosition;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
