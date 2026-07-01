import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/** Host points at a position in the score pre-playback (ui.md "lobby cursor") — visible to all participants via the same broadcast mechanism as PlaybackState. */
export function handleLobbyCursorSet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'lobby-cursor-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can set the lobby cursor' });
    return;
  }

  session.lobbyCursorTick = message.tickPosition;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
