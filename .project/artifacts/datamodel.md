---
name: datamodel
status: stable
last_updated: 2026-07-03
diagram_status: stale
---

# Data Model

## Overview

Canonical entities for sessions, participants, the song catalog, and
playback state. Storage/persistence mechanics are defined in
infrastructure.md (memory-only).

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
| metronomeEnabled | boolean | |
| lobbyCursorTick | number \| null | MIDI tick position the host is pointing at pre-playback (same unit as `PlaybackState.tickPosition`); null once playback starts. Only force-follows every participant's view while `spotlightMode` is true — otherwise each participant browses their own rendered tab independently |
| spotlightMode | boolean | Host-only toggle (default false), same pattern as `metronomeEnabled`/`countInEnabled`. Gates `lobbyCursorTick`'s force-follow effect. Resets to false when playback starts, same as `lobbyCursorTick` resetting to null |

### Participant

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| displayName | string | |
| role | 'host' \| 'member' | |
| connectionStatus | 'connected' \| 'disconnected' | Survives brief drops for reconnect |
| selectedPart | number \| 'lyrics' \| null | A `CatalogPart.trackIndex` for an instrument part, or the literal `'lyrics'` for the tab-less lyrics part (ui.md) — renders no staff, but still runs a headless alphaTab instance for shared clock/metronome (infrastructure.md). Not itself a `CatalogPart` entry — see CatalogSong's `lyricsLrc` |
| readiness | ReadinessStatus | e.g. 'no-part' \| 'loading' \| 'ready' |
| joinedAt | number | Wall-clock time this participant first joined; preserved across a reconnect, not reset. Determines tenure for host succession (infrastructure.md) |

### CatalogSong

| Field | Type | Notes |
|-------|------|-------|
| id | string | Stable song slug (matches the catalog directory name, pipeline.md — e.g. `creep`); what `Session.selectedSong` and the song-selection message reference |
| name | string | |
| artist | string | |
| gpFilePath | string | Client-fetchable URL path to the source `.gp` file (e.g. `/catalog/creep/creep.gp`), not a server filesystem path — the server serves the catalog directory statically over HTTP (infrastructure.md) and the loader rewrites the on-disk path to this URL before publishing `CatalogSong` to any client. One multi-track file per song, matching how Guitar Pro files are normally authored. Loaded once by the client and shared across every part; each `CatalogPart` selects a track within it via `trackIndex` |
| parts | CatalogPart[] | Instrument parts available for this song |
| lyricsLrc | string \| null | Client-fetchable URL path to the raw `.lrc` synced-lyrics file (same URL-rewriting as `gpFilePath`, infrastructure.md). Normally derived from the GP file's embedded lyrics (per-line end timestamps come from GP's last-syllable timing, encoded as blank-text gap lines), with lrclib.net consulted only for line-break placement if GP lacks it; falls back to an lrclib.net-sourced `.lrc` entirely when the GP file has no embedded lyrics at all. Null if no lyrics found either way. Drives the primary lyrics view's timing animation directly from `.lrc` timestamps. Gates whether `'lyrics'` is selectable as a part in the lobby (ui.md) |
| lyricsTrackIndex | number \| null | Index into `gpFilePath`'s parsed score identifying which track's beats actually carry the GP-embedded lyrics (`Beat.lyrics`) — the track lyrics were authored on, not necessarily any `CatalogPart.trackIndex` (the lyrics-bearing track may not be offered as a selectable instrument part at all). Null whenever `lyricsLrc` came from the lrclib.net fallback (no GP-embedded lyrics to point at). The client reads this track's beats at render time to derive syllable text + tick position for the in-tab overlay — no separate tick-map artifact is published (see Normalization Rules) |
| lyricsLineIndex | number \| null | Which index into a beat's `Beat.lyrics` array to read (`Beat.lyrics` is indexed by lyric line/channel — GP supports multiple simultaneous lyric channels, e.g. main vocal vs. a harmony line — not by syllable). Almost always `0`; the pipeline picks the first non-empty channel rather than the client guessing, in case a GP file's primary content isn't at index 0. Same nullability as `lyricsTrackIndex` |
| lyricLineBreaks | number[] \| null | Syllable count per line, in the order syllables appear across `lyricsTrackIndex`'s beats at `lyricsLineIndex`. The client computes line groups from it (`lyrics-beat-walk.ts`'s `groupIntoLines`), but the current in-tab overlay (`ui.md`'s Playback View) is a single continuous scrolling ticker that flattens the syllable stream and never uses those line boundaries for layout — so this field currently has no visible effect on the rendered UI, though it's still computed and unit-tested. Whether it's worth keeping at all, given nothing reads the grouped result for layout, is an open question for a future pass, not resolved here. Same nullability as `lyricsTrackIndex` |

### CatalogPart

| Field | Type | Notes |
|-------|------|-------|
| instrumentName | string | e.g. "Lead Guitar", "Bass" |
| trackIndex | number | Index into the track list of `CatalogSong.gpFilePath`'s parsed score — selects which track alphaTab renders/plays for this part. Also the stable identifier `Participant.selectedPart` references for instrument parts; no separate `id` field, since a track's index is already stable per song and a prior `id: String(trackIndex)` field only duplicated it under a different type. No per-density asset variant to store; bars-per-row density is a live alphaTab display setting applied at render time, not baked into the file. Percussion status (`staveProfile` selection, infrastructure.md) is read from the track's own parsed data (alphaTab exposes this natively — `track.percussionArticulations`/instrument metadata) rather than stored here, per constitution Principle V |

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

## Indexes

Not applicable — session state is in-memory only (infrastructure.md), with
no persistence layer or query surface that would require an index.
