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

  // A song in a private catalogue the session hasn't unlocked isn't
  // selectable — a normal client never receives it in its filtered catalog
  // (visibleCatalog, infrastructure.md), so this can only come from a
  // stale/tampered client. Reject with the *same* error as an unknown id,
  // keeping "locked" indistinguishable from "nonexistent" (a tampered
  // client learns nothing about which private catalogues exist — same
  // no-information posture as the catalogue-unlock handler).
  const catalogue = ctx.catalog.catalogues.find((c) => c.id === song.catalogueId);
  if (catalogue && !catalogue.public && !session.unlockedCatalogueIds.includes(catalogue.id)) {
    ctx.connections.send(socket, { type: 'error', message: `Song ${message.songId} not found` });
    return;
  }

  // Re-selecting the song that's already selected is a no-op on parts/
  // readiness (ui.md) — e.g. re-clicking the same catalog entry shouldn't
  // wipe out everyone's part choice just because the host clicked again.
  if (session.selectedSong !== song.id) {
    session.selectedSong = song.id;
    session.availableParts = song.parts;
    // A different song resets the audio source to synth (datamodel.md
    // Session.playbackSource): the previous song's recording has no bearing on
    // the new one, and the new song may not be recording-capable at all. An
    // unconditional reset subsumes both "song changed" and "new song isn't
    // recording-capable" — a song can't become non-recording-capable without a
    // song change.
    session.playbackSource = 'synth';
    // Host-mandated bars-per-row pin and early-stop point are per-song
    // settings (datamodel.md), same reset-on-song-change pattern.
    session.hostBarsPerRow = null;
    session.earlyStopTick = null;
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
