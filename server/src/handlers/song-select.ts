import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

export function handleSongSelect(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'song-select' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can select a song' });
    return;
  }

  const song = ctx.catalog.songs.find((s) => s.id === message.songId);
  if (!song) {
    ctx.connections.send(socket, { type: 'error', message: `Song ${message.songId} not found` });
    return;
  }

  // Re-selecting the song that's already selected is a no-op on parts/
  // readiness (ui.md) — e.g. re-clicking the same catalog entry shouldn't
  // wipe out everyone's part choice just because the host clicked again.
  if (session.selectedSong !== song.id) {
    session.selectedSong = song.id;
    session.availableParts = song.parts;
    // Selecting a genuinely different song resets every participant's
    // part/readiness — a part id/index from the old song's parts has no
    // guaranteed meaning against the new song's parts.
    for (const participant of session.participants) {
      participant.selectedPart = null;
      participant.readiness = 'no-part';
    }
  }

  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
