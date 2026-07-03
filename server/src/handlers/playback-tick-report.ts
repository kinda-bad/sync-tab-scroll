import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/** Host-only periodic self-report of its real, live-advancing tickPosition (infrastructure.md Session & Real-Time Sync) — the server can't compute this itself since it never parses the GP file, so the host's client is the functional authority; the server just stores and relays what it's told. */
export function handlePlaybackTickReport(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'playback-tick-report' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can report tick position' });
    return;
  }

  session.playbackState.tickPosition = message.tickPosition;
  session.playbackState.serverTimestamp = Date.now();
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
