export * from './messages.js';

export type ReadinessStatus = 'no-part' | 'loading' | 'ready';

export interface Participant {
  id: string;
  displayName: string;
  role: 'host' | 'member';
  connectionStatus: 'connected' | 'disconnected';
  /** A CatalogPart.trackIndex for an instrument part, or the literal 'lyrics' for the tab-less lyrics part. */
  selectedPart: number | 'lyrics' | null;
  readiness: ReadinessStatus;
  /** Wall-clock time this participant first joined — determines tenure for host succession (the longest-tenured connected participant is promoted if the host stays disconnected past the grace period). Preserved across a reconnect, not reset. */
  joinedAt: number;
}

export interface CatalogPart {
  instrumentName: string;
  /** Index into the track list of CatalogSong.gpFilePath's parsed score — also the stable identifier Participant.selectedPart references for instrument parts (no separate id field; a track's index is already stable per song). */
  trackIndex: number;
}

export interface CatalogSong {
  /** Stable song slug, matches the catalog directory name. */
  id: string;
  name: string;
  artist: string;
  /** Client-fetchable URL path to the source .gp file — one multi-track file per song. */
  gpFilePath: string;
  parts: CatalogPart[];
  /** Client-fetchable URL path to the raw .lrc synced-lyrics file. Null if no lyrics found either way. */
  lyricsLrc: string | null;
  /** Which track's beats carry the GP-embedded lyrics. Null when lyricsLrc came from the lrclib.net fallback. */
  lyricsTrackIndex: number | null;
  /** Which index into a beat's Beat.lyrics array to read. Same nullability as lyricsTrackIndex. */
  lyricsLineIndex: number | null;
  /** Syllable count per line, for regrouping the flat per-beat syllable stream. Same nullability as lyricsTrackIndex. */
  lyricLineBreaks: number[] | null;
}

export interface PlaybackState {
  status: 'stopped' | 'running' | 'paused';
  /** MIDI tick position — alphaTab's native score-position unit. */
  tickPosition: number;
  /** Informational — current tempo for display. Not used for tick-to-time math. */
  bpm: number;
  /** Wall-clock time this tickPosition was authoritative. */
  serverTimestamp: number;
}

export interface Session {
  /** Short join code, shown to participants. */
  code: string;
  selectedSong: string | null;
  availableParts: CatalogPart[];
  participants: Participant[];
  /** Participant id with host privileges. */
  hostId: string;
  playbackState: PlaybackState;
  countInEnabled: boolean;
  metronomeEnabled: boolean;
  /** MIDI tick position the host is pointing at pre-playback; null once playback starts. */
  lobbyCursorTick: number | null;
}
