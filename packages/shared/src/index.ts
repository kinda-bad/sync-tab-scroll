export * from './messages.js';

export type ReadinessStatus = 'no-part' | 'loading' | 'ready';

/**
 * A participant's chosen part, single source of truth for both
 * `Participant.selectedPart` and the `part-select` wire message (they must
 * stay identical, so this is the one place that declares the shape —
 * constitution Principle VI). Explicit semantics per branch:
 * - `number` — a `CatalogPart.trackIndex`: following that instrument track.
 * - `'lyrics'` — the tab-less lyrics part (a special case, not a
 *   `CatalogPart` at all — see `CatalogSong.lyricsLrc`).
 * - `null` — no part chosen yet.
 */
export type SelectedPart = number | 'lyrics' | null;

export interface Participant {
  id: string;
  displayName: string;
  role: 'host' | 'member';
  connectionStatus: 'connected' | 'disconnected';
  selectedPart: SelectedPart;
  readiness: ReadinessStatus;
  /** Wall-clock time this participant first joined — determines tenure for host succession (the longest-tenured connected participant is promoted if the host stays disconnected past the grace period). Preserved across a reconnect, not reset. */
  joinedAt: number;
}

export interface CatalogPart {
  instrumentName: string;
  /** Index into the track list of CatalogSong.gpFilePath's parsed score — also the stable identifier Participant.selectedPart references for instrument parts (no separate id field; a track's index is already stable per song). */
  trackIndex: number;
}

export interface Catalogue {
  /** Stable catalogue slug (matches the catalogue directory name), or the literal `"default"` for songs with no catalogue directory. */
  id: string;
  /** Display name shown in the lobby's catalogue picker — always visible, even for a locked private catalogue (only its songs are withheld). */
  name: string;
  /** `false` only for a catalogue with a Catalogue Activation Key record (`catalogue.json`). A catalogue directory with no key record is public — presence of the key record *is* the privacy signal (datamodel.md Catalogue). */
  public: boolean;
}

export interface CatalogSong {
  /** Stable song slug, matches the catalog directory name. */
  id: string;
  /** `Catalogue.id` this song belongs to — `"default"` for a song with no catalogue directory (datamodel.md CatalogSong). */
  catalogueId: string;
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
  /** MIDI tick position the host is pointing at pre-playback; null once playback starts. Only force-follows participants' views while spotlightMode is true. */
  lobbyCursorTick: number | null;
  /** Host-only toggle; while true, lobbyCursorTick force-follows every participant's view. Resets to false when playback starts. */
  spotlightMode: boolean;
  /** Participant.id of a non-host asking to become host; null when no request is outstanding. See infrastructure.md Host Transfer. */
  pendingHostRequest: string | null;
}
