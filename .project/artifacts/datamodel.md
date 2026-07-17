---
name: datamodel
status: stable
last_updated: 2026-07-14
diagram_type: erDiagram
render_section: Datamodel
diagram_status: current
---

# Data Model

## Overview

Canonical entities for sessions, participants, the song catalog, and
playback state — all **in-memory only**. A separate **durable account
layer** (`User`, `CatalogueMembership`, `AuthSession` — Postgres, see below)
was added for optional user accounts (constitution v1.5.0). It is the *only*
persisted state, it is **optional** (the server runs with no database
configured; auth and persistence self-disable when unconfigured —
infrastructure.md), and it never persists realtime session state. Anonymous
and logged-in participants coexist in the same session; accounts are strictly
additive — nothing about the anonymous path changes. Storage/persistence
mechanics are defined in infrastructure.md.

Lyrics exist in two forms per song: a raw `.lrc` file (line-level
timestamps, drives the primary lyrics view) and, for the in-tab overlay,
a pointer (`lyricsTrackIndex` + `lyricsLineIndex` + `lyricLineBreaks`) at
the GP track/channel that actually carries the lyrics — not a precomputed
tick map. Both are normally produced together, straight from lyrics
embedded in the source Guitar Pro file, including an accurate per-line end
timestamp (encoded as a blank-text LRC line) taken from the GP timing of
that line's last syllable — this end-timestamp accuracy is the reason
`.lrc` is GP-derived rather than taken from lrclib.net directly
(pipeline.md). lrclib.net plays two distinct, narrower roles: as a
line-break reference when GP has lyrics but no marked line boundaries
(GP timing still used throughout), and as a full fallback `.lrc` source
when GP has no embedded lyrics at all — only the fallback case leaves
`lyricsTrackIndex`/`lyricsLineIndex`/`lyricLineBreaks` null. The
lyrics-view and in-tab-overlay data are independent and not guaranteed to
co-occur — see `ui.md` for how each is gated.

The full `CatalogSong[]` list is server-global, not per-session — it's
loaded once at server startup (pipeline.md) and delivered to a client
once it creates or joins a session, independent of `Session` itself
(infrastructure.md). The host selects a song by `CatalogSong.id`, which
populates `Session.selectedSong` and `Session.availableParts`.

**As of Phase 2 (in-app authoring), the server-global catalog is mutable at
runtime**, not just at startup: an authenticated owner's in-app catalogue
create/song-add action writes to the filesystem (Railway volume, same
on-disk format the pipeline writes) and triggers a re-scan, updating the
in-memory catalog and re-broadcasting `catalog` to every affected session
— the same re-broadcast shape `catalogue-unlock` already uses when a
session's visible set grows (infrastructure.md). `Catalogue`/`CatalogSong`
still have no durable Postgres rows of their own — the filesystem stays
the single format; only *ownership* of a catalogue (`CatalogueOwnership`,
below) is a durable row.

Every song belongs to exactly one `Catalogue` (`CatalogSong.catalogueId`,
below). A catalogue is either public (its songs are always included in
what a client receives) or private, gated behind an activation key a
host unlocks per-session (`Session.unlockedCatalogueIds`,
`catalog-activation-key-access` — infrastructure.md's `catalogue-unlock`
message). This is the one exception to "delivered once, independent of
`Session`" above: a private catalogue's songs are withheld from the
initial delivery and only included once that session has unlocked it —
see infrastructure.md's Song Catalog Delivery for how re-delivery works.
Songs sitting directly under `catalog/<song-slug>/` (no catalogue
directory) belong to an implicit `"default"` catalogue — always public,
no key — so existing local/personal deployments need no migration.

## Entities

### Session

| Field | Type | Notes |
|-------|------|-------|
| code | string | Short join code, shown to participants. 4 characters, drawn from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (uppercase letters + digits, minus `I`/`O`/`0`/`1` — visually ambiguous when read off one screen and typed into another) (`server/src/session-store.ts`). 4 was chosen as small and easy to communicate verbally/by glance; the charset has 32 symbols, so collision risk only becomes a real concern well beyond this app's expected concurrent-session scale. Lengthen if that scale need ever arises — the generator and this note should be updated together |
| selectedSong | string \| null | A `CatalogSong.id` (song slug), or null before the host has picked a song |
| availableParts | CatalogPart[] | Parts for the selected song |
| participants | Participant[] | |
| hostId | string | Participant id with host privileges |
| playbackState | PlaybackState | Clock state the server stores and relays; `tickPosition` itself is host-client-authoritative, not server-computed (infrastructure.md) |
| countInEnabled | boolean | |
| lobbyCursorTick | number \| null | MIDI tick position the host is pointing at pre-playback (same unit as `PlaybackState.tickPosition`); null once playback starts. Only force-follows every participant's view while `spotlightMode` is true — otherwise each participant browses their own rendered tab independently |
| spotlightMode | boolean | Host-only toggle (default false), same pattern as `countInEnabled`. Gates `lobbyCursorTick`'s force-follow effect. Resets to false when playback starts, same as `lobbyCursorTick` resetting to null |
| pendingHostRequest | string \| null | `Participant.id` of a non-host participant who has asked to become host; null when no request is outstanding. Set by a `request-host` message; cleared either by the current host declining it (`host-request-decline`), by the host granting *any* host transfer that resolves it (accepting this request is not a separate action from `host-delegate` targeting the same participant — see infrastructure.md's Host Transfer), or by the requester disconnecting before the host responds. At most one outstanding request at a time — a second `request-host` while one is already pending is rejected as an error, not queued |
| unlockedCatalogueIds | string[] | Private `Catalogue.id` values unlocked for this session (public catalogues need no entry). Starts empty. It is the union of two conceptually distinct slices: (a) a **key-entered slice** — catalogues a host unlocked by typing the activation key this session (`catalogue-unlock`, infrastructure.md); this is a session fact, sticky, and survives host succession, exactly as before accounts existed; and (b) a **membership-derived slice** — when the current host is a logged-in `User`, the private catalogues in the host's `CatalogueMembership` set. The membership-derived slice is **re-derived whenever `hostId` changes** (host succession, infrastructure.md), not left append-only: on host change it is recomputed from the *new* host's memberships, so a catalogue unlocked only by a departed host's membership re-locks if the new host isn't a member (per the accounts design's host-only auto-unlock, §13 S4). Still per-session for anonymous hosts (no persistence) |

### Participant

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| userId | string \| null | Optional reference to a `User.id` (account layer, below). Null for an **anonymous** participant — the default; anonymous and logged-in participants coexist in one session. Set when a participant joins with a valid `AuthSession` cookie. Seeds host-only catalogue auto-unlock from the host's `CatalogueMembership` set (see `unlockedCatalogueIds`). **As of Phase 2 (in-app authoring), also broadcast to peers** in `session-state` — peer-visible identity is what makes an ownership/invite UI (e.g. "invite this participant as a co-owner") meaningful; Phase 1 kept it connection-registry-only since nothing needed it broadcast yet |
| displayName | string | |
| role | 'host' \| 'member' | |
| connectionStatus | 'connected' \| 'disconnected' | Survives brief drops for reconnect |
| selectedPart | number \| 'lyrics' \| null | A `CatalogPart.trackIndex` for an instrument part, or the literal `'lyrics'` for the tab-less lyrics part (ui.md) — renders no staff, but still runs a headless alphaTab instance for the shared clock (infrastructure.md), with this participant's own personal metronome preference (`client/src/metronome-preference.ts`) applied locally to that instance — not a session-level setting. Not itself a `CatalogPart` entry — see CatalogSong's `lyricsLrc` |
| readiness | ReadinessStatus | e.g. 'no-part' \| 'loading' \| 'ready' |
| joinedAt | number | Wall-clock time this participant first joined; preserved across a reconnect, not reset. Determines tenure for host succession (infrastructure.md) |

### CatalogSong

| Field | Type | Notes |
|-------|------|-------|
| id | string | Stable song slug (matches the catalog directory name, pipeline.md — e.g. `creep`); what `Session.selectedSong` and the song-selection message reference |
| catalogueId | string | `Catalogue.id` this song belongs to — `"default"` for a song with no catalogue directory (backward compatibility, above) |
| name | string | |
| artist | string | |
| gpFilePath | string | Client-fetchable URL path to the source `.gp` file (e.g. `/catalog/creep/creep.gp`), not a server filesystem path — the server serves the catalog directory statically over HTTP (infrastructure.md) and the loader rewrites the on-disk path to this URL before publishing `CatalogSong` to any client. One multi-track file per song, matching how Guitar Pro files are normally authored. Loaded once by the client and shared across every part; each `CatalogPart` selects a track within it via `trackIndex` |
| parts | CatalogPart[] | Instrument parts available for this song |
| lyricsLrc | string \| null | Client-fetchable URL path to the raw `.lrc` synced-lyrics file (same URL-rewriting as `gpFilePath`, infrastructure.md). Normally derived from the GP file's embedded lyrics (per-line end timestamps come from GP's last-syllable timing, encoded as blank-text gap lines), with lrclib.net consulted only for line-break placement if GP lacks it; falls back to an lrclib.net-sourced `.lrc` entirely when the GP file has no embedded lyrics at all. Null if no lyrics found either way. Drives the primary lyrics view's timing animation directly from `.lrc` timestamps. Gates whether `'lyrics'` is selectable as a part in the lobby (ui.md) |
| lyricsTrackIndex | number \| null | Index into `gpFilePath`'s parsed score identifying which track's beats actually carry the GP-embedded lyrics (`Beat.lyrics`) — the track lyrics were authored on, not necessarily any `CatalogPart.trackIndex` (the lyrics-bearing track may not be offered as a selectable instrument part at all). Null whenever `lyricsLrc` came from the lrclib.net fallback (no GP-embedded lyrics to point at). The client reads this track's beats at render time to derive syllable text + tick position for the in-tab overlay — no separate tick-map artifact is published (see Normalization Rules) |
| lyricsLineIndex | number \| null | Which index into a beat's `Beat.lyrics` array to read (`Beat.lyrics` is indexed by lyric line/channel — GP supports multiple simultaneous lyric channels, e.g. main vocal vs. a harmony line — not by syllable). Almost always `0`; the pipeline picks the first non-empty channel rather than the client guessing, in case a GP file's primary content isn't at index 0. Same nullability as `lyricsTrackIndex` |
| lyricLineBreaks | number[] \| null | Syllable count per line, in the order syllables appear across `lyricsTrackIndex`'s beats at `lyricsLineIndex`. The client computes line groups from it (`lyrics-beat-walk.ts`'s `groupIntoLines`), but the current in-tab overlay (`ui.md`'s Playback View) is a single continuous scrolling ticker that flattens the syllable stream and never uses those line boundaries for layout — so this field currently has no visible effect on the rendered UI, though it's still computed and unit-tested. **Resolved as intentionally retained**: it's cheap to compute, already unit-tested, and a plausible input for a future multi-line/paged lyrics view; revisit only if a deliberate simplification pass wants it gone (which would be code work — pipeline extraction, `meta.json`, and `lyrics-beat-walk.ts` — not just an artifact edit). Same nullability as `lyricsTrackIndex` |

### Catalogue

| Field | Type | Notes |
|-------|------|-------|
| id | string | Stable catalogue slug (matches the catalogue directory name, pipeline.md — e.g. `premium-pack`), or the literal `"default"` for songs with no catalogue directory |
| name | string | Display name shown in the lobby's catalogue picker (ui.md), including for a locked private catalogue — the *name* is always visible; only its songs are withheld until unlocked |
| public | boolean | `false` only for a catalogue with a Catalogue Activation Key record (below). A catalogue directory with no key record is public — there's no separate flag to set; presence of the key record *is* the privacy signal, so the two can't drift out of sync |

Delivered to every client at session join as part of the same `catalog`
message infrastructure.md's Song Catalog Delivery already documents —
every `Catalogue`'s metadata is always sent, but a private one's
`CatalogSong[]` entries are withheld until that session unlocks it.

### CatalogPart

| Field | Type | Notes |
|-------|------|-------|
| instrumentName | string | e.g. "Lead Guitar", "Bass" |
| trackIndex | number | Index into the track list of `CatalogSong.gpFilePath`'s parsed score — selects which track alphaTab renders/plays for this part. Also the stable identifier `Participant.selectedPart` references for instrument parts; no separate `id` field, since a track's index is already stable per song and a prior `id: String(trackIndex)` field only duplicated it under a different type. No per-density asset variant to store; bars-per-row density is a live alphaTab display setting applied at render time, not baked into the file. Percussion status (`staveProfile` selection, infrastructure.md) is read from the track's own parsed data (alphaTab exposes this natively — `track.isPercussion`) rather than stored here, per constitution Principle V |

### PlaybackState

| Field | Type | Notes |
|-------|------|-------|
| status | 'stopped' \| 'running' \| 'paused' | |
| tickPosition | number | MIDI tick position — alphaTab's native score-position unit (`api.tickPosition`), instrument-agnostic and density-agnostic. Host-client-authoritative, not server-computed: the server never parses the GP file, so it has no tempo/PPQ knowledge to derive tick position from elapsed time itself. While playback is `'running'`, the host's client periodically self-reports its own real, continuously-advancing `api.tickPosition` (`playback-tick-report` message, ~1/sec); the server just stores whatever it's told and relays it via the existing periodic broadcast (infrastructure.md) |
| bpm | number | Informational — current tempo for display (e.g. lobby/playback tempo readout). Not used for tick-to-time math; each client's alphaTab instance derives timing from the score's own tempo map |
| serverTimestamp | number | Wall-clock time the host last reported `tickPosition` (refreshed by the server alongside it on each `playback-tick-report`). Each participant's alphaTab instance (visible or headless, per ui.md) drives its own local clock from playback start and periodically re-syncs `tickPosition`/`timePosition` against this rather than being continuously driven by the server (infrastructure.md). Using `serverTimestamp` to extrapolate/compensate for propagation latency is a deferred future refinement, not implemented yet |

## Normalization Rules

Position is tracked in **MIDI ticks**, alphaTab's native score-position
unit — not wall-clock seconds, and no longer beats. This is still
render-density-agnostic — bars-per-row is a live alphaTab display setting
(infrastructure.md), not a stored per-density asset, so there is no
separate layout map to reconcile tick position against. Each client's
alphaTab instance computes screen/cursor position from tick position
itself, at render time, from the same render pass that draws the staff —
there is nothing analogous to the old `LayoutMap` to keep in sync.

Syllable tick positions for the in-tab overlay are **not** published by the
pipeline as a precomputed map. alphaTab already attaches lyric text to
`Beat.lyrics` and computes each beat's tick position natively as part of
parsing the `.gp` file the client already loads — publishing a redundant
offline tick map would duplicate data the client can read directly off
the same parsed score (constitution Principle V). `Beat.lyrics` is indexed
by lyric line/channel, not by syllable (GP supports multiple simultaneous
lyric channels), so the pipeline also publishes `lyricsLineIndex` — which
channel to read — rather than leaving the client to guess index `0` is
always right. The pipeline instead publishes `lyricsTrackIndex` (which
track's beats to read), `lyricsLineIndex` (which channel within those
beats), and `lyricLineBreaks` (syllable-count-per-line, to regroup the
flat per-beat stream into the same lines as `.lrc`) — the pieces alphaTab
doesn't give you directly, since GP doesn't always mark line boundaries
and lrclib is sometimes consulted to place them (pipeline.md). Only
produced when lyrics came from the GP-embedded path in the first place;
the lrclib.net fallback has no GP track to point at.

## Consent Record (Public Deployment Only)

Not a field on `CatalogSong` and never sent to any client — it's an
on-disk gate `catalog-loader.ts` reads at startup (infrastructure.md's
Song Consent Gate), only when an operator has opted into
`requireSongConsent`. Lives as a companion file in a song's own directory
alongside its `.gp`/`.lrc`/`meta.json` (pipeline.md's Inputs & Outputs On
Disk), one record per song. **Resolved as per-song, not per-submitter** —
the simpler shape (no separate submitter registry/entity to introduce, no
cross-song identity to reconcile), accepting that a submitter contributing
multiple songs re-records consent per song rather than once; revisit only
if that duplication becomes real friction, not preemptively.

| Field | Type | Notes |
|-------|------|-------|
| submitterName | string | Free-text identifier the submitter gives (name/handle/contact) — not a validated or authenticated identity. It's supplied to the operator-run `record-consent` CLI, independent of the optional user-accounts layer (that layer authenticates *app users*, not song submitters), so this stays a record-keeping field, not an access-control key |
| tosVersion | string | Which version/text of the distribution-license ToS clause was accepted. The exact ToS wording is a legal/operator decision, not a design one, so it's deliberately left to the operator — `record-consent` writes a production-annotated placeholder (`dev-placeholder`) until real ToS text is supplied (see Production Annotations) |
| acceptedAt | number | Wall-clock timestamp consent was recorded |

Written by a small companion CLI step to the existing lyrics-extraction
pipeline (pipeline.md), not a web form — consistent with the pipeline's
existing operator-driven, offline, source-controlled-inputs model
(constitution Principle V spirit: no new mechanism built where the
existing one already covers the workflow shape). **Resolved as a CLI drop-in
over a web upload form** — a web upload endpoint was considered
and rejected: it would require a new HTTP surface accepting
arbitrary file uploads from the public internet (a materially different
threat model than this app's stated self-hosted/small-group posture,
infrastructure.md), submitter-facing identity/session handling that
doesn't otherwise exist, and file-size/validation/staging concerns with
no current evidence of need. Revisit if operators report the CLI step is
actually a submission bottleneck in practice.

**Reversed for the Consent Record specifically, by Phase 2 (in-app
authoring, constitution v1.6.0):** an authenticated catalogue owner's
in-app song-add flow (infrastructure.md's In-App Authoring section) *does*
write a Consent Record — via the same shape this CLI writes, not a second
format — since the size-limit/validation/staging concerns this resolution
originally cited are exactly what Phase 2's Upload Trust Surface
(infrastructure.md) now owns, and owner-authentication (via
`CatalogueOwnership`) supplies the identity/session handling this
resolution said didn't otherwise exist. This CLI path is **not removed** —
it remains how a fresh/self-hosted deployment seeds its initial catalog
without any account layer configured at all.

## Catalogue Activation Key (Public Deployment Only)

Not a field on `Catalogue` and never sent to any client in any form —
an on-disk gate `catalog-loader.ts` reads at startup, same pattern as
the Consent Record above but scoped to a whole catalogue directory
rather than one song. Lives as `catalogue.json` in the catalogue's own
directory (pipeline.md's Inputs & Outputs On Disk), one record per
private catalogue. A catalogue directory with no `catalogue.json` is
public (`Catalogue.public`, above).

| Field | Type | Notes |
|-------|------|-------|
| salt | string | Random per-catalogue salt (hex), generated once when the catalogue is created |
| hash | string | `crypto.scrypt(key, salt, 64)` (hex) of the activation key — the raw key itself is never written to disk anywhere; only entered once, on the operator's own machine, when running the pipeline's `create-catalogue` CLI (pipeline.md) |
| epoch | number | Monotonic key generation, starting at `1`. Rotating a leaked key (regenerating `salt`/`hash` for a new key) bumps `epoch`. A durable `CatalogueMembership` granted `via:'key'` records the `epoch` it redeemed; a membership whose `keyEpoch` is below the catalogue's current `epoch` is stale and no longer grants access — this is what lets a key rotation actually revoke previously-redeemed leaked-key access (§13 S5 of the accounts design). Absent/treated as `1` for a pre-existing `catalogue.json` written before this field |

Verified server-side with `crypto.timingSafeEqual` against a
freshly-computed hash of the submitted key (`catalogue-unlock`,
infrastructure.md) — not a plain `===` string comparison, to avoid a
timing side-channel. This is a deliberate, modest step up from the
Consent Record's plaintext fields above: an activation key is meant to
actually gate access to content, where a consent record's
`submitterName` is explicitly *not* an access-control value — the two
have different threat models even though both are simple on-disk JSON
files read at catalog-load time. No rate limiting or lockout on repeated
wrong-key attempts (Production Posture's existing no-rate-limiting scope
already covers this).

## Account Layer (Durable — Postgres, optional)

The project's first durable store (constitution v1.5.0), added for optional
OAuth user accounts. **Optional by construction**: with no database
configured the server runs exactly as before — auth self-disables, every
participant is anonymous, and per-session key unlock is the only access path.
These three entities are the *only* persisted records anywhere; realtime
`Session`/`Participant`/`PlaybackState` stay in-memory (above). Design of
record: `.project/design-user-accounts-2026-07-12.reviewed.md`.

**No cross-store foreign keys to the filesystem catalog.** `Catalogue`,
`CatalogSong`, and the Activation Key are filesystem-derived, not durable
rows, so `CatalogueMembership.catalogueId` is a **plain string, not an FK** —
a membership to a catalogue that isn't currently loaded is deliberately
**inert** (the catalog-visibility logic ignores ids it can't resolve), never
an integrity error. Do not "fix" this with referential enforcement.

### User

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | Server-generated durable id |
| oauthProvider | 'google' \| 'github' | Which OAuth provider authenticated this user |
| oauthSubject | string | The provider's stable subject (`sub`) id. `(oauthProvider, oauthSubject)` is the unique login key. No account-linking across providers — the same person signing in with Google vs. GitHub is two `User` rows, accepted deliberately (revisit only if linking becomes a real need) |
| displayName | string | From the provider profile |
| email | string \| null | From the provider; may be absent or unverified depending on granted scope — record-keeping only, not an access-control key |
| createdAt | number | Wall-clock time the account was first created |

### CatalogueMembership

The durable form of "this user has unlocked this catalogue." Seeds the
host-only membership-derived slice of `Session.unlockedCatalogueIds` (above).

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | |
| userId | string | References `User.id` (same store — a real FK here) |
| catalogueId | string | The catalogue's **stable id** as a plain string — **no cross-store FK** (see above). Uses the stable id, not a display slug, so a future user-created catalogue reusing a slug can't collide into an existing grant (§13 S8) |
| grantedVia | 'owner' \| 'key' \| 'invite' | How access was granted. `'key'` = redeemed the activation key; `'owner'` = created/owns the catalogue; `'invite'` = directly invited by an owner. `'owner'`/`'invite'` are live as of Phase 2 (in-app authoring) — a `CatalogueOwnership` row (below) is what actually grants `'owner'`, and an invite flow writes `'invite'` |
| keyEpoch | number \| null | For `grantedVia:'key'` only: the Activation Key `epoch` this grant redeemed. Access requires `keyEpoch` to equal the catalogue's current `epoch`; a key rotation bumps the epoch and strands old key-grants (§13 S5). Null for `'owner'`/`'invite'` (not key-derived) |
| grantedAt | number | Wall-clock time access was granted |

### CatalogueOwnership (Phase 2 — in-app authoring)

The durable form of "this user owns/can edit this catalogue" — kept as its
own row/table rather than a field on `Catalogue`, because `Catalogue` is
**not a durable entity**: it's derived at startup (and, as of Phase 2, at
every authoring write) from a filesystem scan (`catalog-loader.ts`,
infrastructure.md). An ownership row is what lets an in-app "create
catalogue" or "add song" action authorize itself, and is also what a
`CatalogueMembership(grantedVia:'owner')` row derives from — creating an
ownership grants the matching membership so an owner is never locked out
of their own catalogue's content.

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | |
| catalogueId | string | The catalogue's stable id — same no-cross-store-FK rule as `CatalogueMembership.catalogueId` above (a plain string, inert if it resolves to nothing on disk) |
| ownerId | string | References `User.id` (same store — a real FK here) |
| createdAt | number | Wall-clock time ownership was established. For the pre-existing filesystem catalogues that predate accounts (e.g. `kinda-bad`), this is set by a one-time operator CLI (`set-catalogue-owner <slug> <user-email>` or similar) — there is no in-app path to claim ownership of a catalogue nobody created in-app |

### AuthSession

Revocable server-side session (§13 S2) — chosen over a stateless long-lived
cookie precisely so sessions can be killed (logout, logout-everywhere,
post-compromise). Named `AuthSession` to avoid collision with the in-memory
realtime `Session` entity, which is unrelated.

| Field | Type | Notes |
|-------|------|-------|
| id | string | Opaque high-entropy session id — the value carried in the HTTP-only cookie. The cookie holds *only* this id, never user data or a signed claim |
| userId | string | References `User.id` |
| createdAt | number | |
| expiresAt | number | Server-enforced expiry; a session past this is invalid regardless of the cookie |
| revokedAt | number \| null | Set to invalidate the session before expiry (explicit logout, logout-everywhere, or a security revocation). Checked server-side on every authenticated HTTP request and on the WebSocket upgrade (infrastructure.md) |

## Indexes

Session state is in-memory only (infrastructure.md), so the realtime
entities need no index; the Consent Record and Catalogue Activation Key are
read once at catalog-load time, not queried.

The durable Account Layer (Postgres) does need indexes for its query
patterns:
- `User` — unique index on `(oauthProvider, oauthSubject)` (the login
  lookup on every OAuth callback).
- `CatalogueMembership` — index on `userId` (fetch a host's memberships to
  seed/re-derive `unlockedCatalogueIds`); optionally `(userId, catalogueId)`
  unique to keep one grant per user-catalogue pair.
- `AuthSession` — primary lookup by `id` (cookie → session on every
  authenticated request); index on `userId` for logout-everywhere/revocation.
- `CatalogueOwnership` (Phase 2) — index on `ownerId` (an owner's own
  catalogue list, and the per-user-visibility check — infrastructure.md —
  needs "does this user own catalogue X" cheaply on every `catalog`
  message build).

## Production Annotations

- **Placeholder ToS version in the Consent Record.** `Consent Record`'s
  `tosVersion` is written as a placeholder string (`record-consent`'s
  `dev-placeholder`), not a real distribution-license clause version. The
  exact ToS wording is a legal/operator decision this model doesn't resolve
  — an operator relying on recorded consent for a real public deployment
  must replace the placeholder with the actual accepted ToS version before
  the recorded consent means anything legally. Annotated at
  `packages/pipeline/src/record-consent.ts`.
