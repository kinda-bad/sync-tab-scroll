import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import { isRecordingCapable } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/**
 * Host-only toggle for the session-wide audio source (datamodel.md
 * Session.playbackSource, infrastructure.md). Mirrors `playback-control`'s
 * host authorization. Rejected while playback is `running` — switching source
 * mid-playback would tear down and rebuild every participant's engine underneath
 * live audio. Switching to `'recording'` requires the selected song to be
 * recording-capable (same tamper posture as song-select; a well-behaved client
 * never offers the control otherwise, T017).
 */
export function handlePlaybackSourceSet(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'playback-source-set' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can control the audio source' });
    return;
  }

  if (session.playbackState.status === 'running') {
    ctx.connections.send(socket, { type: 'error', message: 'Cannot change the audio source while playback is running' });
    return;
  }

  if (message.source === 'recording') {
    const song = ctx.catalog.songs.find((s) => s.id === session.selectedSong);
    if (!isRecordingCapable(song)) {
      ctx.connections.send(socket, { type: 'error', message: 'This song has no recording to play' });
      return;
    }
  }

  session.playbackSource = message.source;
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
