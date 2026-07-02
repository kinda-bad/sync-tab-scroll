import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/** Host-only toggle gating whether lobbyCursorTick force-follows every participant's view (ui.md "Spotlight mode"). */
export function handleSpotlightModeSet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'spotlight-mode-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can set Spotlight mode' });
    return;
  }

  session.spotlightMode = message.enabled;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
