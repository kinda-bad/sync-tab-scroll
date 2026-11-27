import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/**
 * Host-only start marker (ui.md "Start marker", per-song-default-start-point) —
 * same set/clear pattern as early-stop-set.ts. The bar must be a positive
 * integer; whether it exists in the score is checked by the host's client,
 * the only side that parses the `.gp` (an out-of-range bar just never seeks).
 * Clearing while stopped also returns the parked position to bar 1, since
 * the marker was where the Lobby was parked; a paused position is left alone.
 * Setting it needs no position change here: the host's client sees the new
 * marker and seeks to it (playback-engine.ts).
 */
export function handleStartMarkerSet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'start-marker-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can set the start marker' });
    return;
  }

  const { bar } = message;
  if (bar !== null && !(Number.isInteger(bar) && bar >= 1)) {
    ctx.connections.send(socket, { type: 'error', message: 'Start marker must be a bar number (1 or more)' });
    return;
  }

  session.startMarkerBar = bar;
  if (bar === null && session.playbackState.status === 'stopped') {
    session.playbackState.tickPosition = 0;
    session.playbackState.serverTimestamp = Date.now();
  }
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
