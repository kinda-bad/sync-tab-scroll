export * from './messages.js';
export * from './lyrics-walk.js';
export * from './lyrics-dispatch.js';

// --- Durable Account Layer (datamodel.md Account Layer; constitution v1.5.0) ---
// Optional OAuth accounts backed by an optional Postgres store. These three
// entities are the ONLY persisted records anywhere; realtime Session/
// Participant/PlaybackState stay in-memory. Named, exported, single-source-of-
// truth types (Principle VI) so the repository seam, handlers, and any wire
// use share one shape.

/** Which OAuth provider authenticated a `User` (datamodel.md User). */
export type OAuthProvider = 'google' | 'github';

/** How a `CatalogueMembership` was granted (datamodel.md CatalogueMembership). `'key'` is Phase 1; `'owner'`/`'invite'` are authoring/Phase 2. */
export type CatalogueGrantVia = 'owner' | 'key' | 'invite';

/**
 * A durable OAuth user (datamodel.md User). `(oauthProvider, oauthSubject)` is
 * the unique login key — no account-linking across providers (two rows for the
 * same human signing in with Google vs GitHub, accepted deliberately).
 */
export interface User {
  /** Server-generated durable id (uuid). */
  id: string;
  oauthProvider: OAuthProvider;
  /** The provider's stable subject (`sub`) id. */
  oauthSubject: string;
  displayName: string;
  /** From the provider; may be absent/unverified — record-keeping only, not an access-control key. */
  email: string | null;
  /** Wall-clock time the account was first created. */
  createdAt: number;
}

/**
 * The durable form of "this user has unlocked this catalogue" (datamodel.md
 * CatalogueMembership). Seeds the host-only membership-derived slice of
 * `Session.unlockedCatalogueIds`.
 */
export interface CatalogueMembership {
  id: string;
  /** References `User.id` (same store — a real FK). */
  userId: string;
  /** The catalogue's **stable id** as a plain string — no cross-store FK (§13 S8). */
  catalogueId: string;
  grantedVia: CatalogueGrantVia;
  /** For `grantedVia:'key'` only: the Activation Key `epoch` this grant redeemed; access requires it to equal the catalogue's current `epoch` (§13 S5). Null for `'owner'`/`'invite'`. */
  keyEpoch: number | null;
  /** Wall-clock time access was granted. */
  grantedAt: number;
}

/**
 * The durable form of "this user owns/can edit this catalogue" (datamodel.md
 * CatalogueOwnership, Phase 2 in-app authoring). Kept as its own row rather than
 * a field on `Catalogue`, since `Catalogue` is filesystem-derived, not durable.
 * Creating an ownership row also grants the matching
 * `CatalogueMembership(grantedVia:'owner')` row.
 */
export interface CatalogueOwnership {
  id: string;
  /** The catalogue's stable id — plain string, no cross-store FK (§13 S8). */
  catalogueId: string;
  /** References `User.id` (same store — a real FK). */
  ownerId: string;
  /** Wall-clock time ownership was established. */
  createdAt: number;
}

/**
 * Revocable server-side session (§13 S2) — the opaque `id` is the only value
 * carried in the HTTP-only cookie. Named `AuthSession` to avoid collision with
 * the in-memory realtime `Session` entity, which is unrelated.
 */
export interface AuthSession {
  /** Opaque high-entropy session id — the value carried in the HTTP-only cookie. */
  id: string;
  /** References `User.id`. */
  userId: string;
  createdAt: number;
  /** Server-enforced expiry; a session past this is invalid regardless of the cookie. */
  expiresAt: number;
  /** Set to invalidate the session before expiry (logout, logout-everywhere, security revocation). */
  revokedAt: number | null;
}

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
  /**
   * The authenticated account `userId`, or `null` for an anonymous participant
   * (datamodel.md Participant). As of Phase 2 (in-app authoring) this is
   * broadcast to peers in `session-state` — peer-visible identity is what makes
   * an ownership/invite UI meaningful; Phase 1 kept it connection-registry-only
   * since nothing needed it broadcast yet.
   */
  userId: string | null;
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
  /** `Catalogue.id` values this session's host has successfully unlocked (`catalogue-unlock`, infrastructure.md). Only ever private catalogue ids; public catalogues need no entry. Starts empty; per-session, never persisted. */
  unlockedCatalogueIds: string[];
}
