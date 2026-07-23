import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/** Host-only bars-per-row layout pin (ui.md "Layout" control) — same pattern as spotlight-mode-set.ts. */
export function handleBarsPerRowSet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'bars-per-row-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can set the bars-per-row layout' });
    return;
  }

  session.hostBarsPerRow = message.barsPerRow;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
