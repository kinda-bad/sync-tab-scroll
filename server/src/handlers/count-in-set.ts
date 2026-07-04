import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/** Host-only toggle for the session's pre-playback count-in (ui.md, datamodel.md Session.countInEnabled). */
export function handleCountInSet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'count-in-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can control count-in' });
    return;
  }

  session.countInEnabled = message.enabled;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
