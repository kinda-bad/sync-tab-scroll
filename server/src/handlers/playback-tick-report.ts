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

  // Host early-stop point (host-set-early-stop-point-for): once the
  // host-reported tick passes the threshold, auto-trigger the same Stop
  // transition playback-control.ts's 'stop' action uses — full stop, not
  // pause-in-place, resetting tickPosition to 0 and sending everyone back
  // to the Lobby (ws-client.ts keys the view transition off this status).
  if (session.earlyStopTick !== null && session.playbackState.status === 'running' && session.playbackState.tickPosition >= session.earlyStopTick) {
    session.playbackState.status = 'stopped';
    session.playbackState.tickPosition = 0;
  }

  session.playbackState.serverTimestamp = Date.now();
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
