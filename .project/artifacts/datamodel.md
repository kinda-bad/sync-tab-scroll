---
name: datamodel
status: stable
last_updated: 2026-06-30
diagram_status: current
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

## Entities

### Session

| Field | Type | Notes |
|-------|------|-------|
| code | string | Short join code, shown to participants |
| selectedSong | string \| null | |
| availableParts | CatalogPart[] | Parts for the selected song |
| participants | Participant[] | |
| hostId | string | Participant id with host privileges |
| playbackState | PlaybackState | Server-authoritative clock state |
| countInEnabled | boolean | |
| metronomeEnabled | boolean | |
| lobbyCursorTick | number \| null | MIDI tick position the host is pointing at pre-playback (same unit as `PlaybackState.tickPosition`); null once playback starts |

### Participant

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| displayName | string | |
| role | 'host' \| 'member' | |
| connectionStatus | 'connected' \| 'disconnected' | Survives brief drops for reconnect |
| selectedPart | string \| 'lyrics' \| null | A `CatalogPart.id` for an instrument part, or the literal `'lyrics'` for the tab-less lyrics part (ui.md) — renders no staff, but still runs a headless alphaTab instance for shared clock/metronome (infrastructure.md). Not itself a `CatalogPart` entry — see CatalogSong's `lyricsLrc` |
| readiness | ReadinessStatus | e.g. 'no-part' \| 'loading' \| 'ready' |

### CatalogSong

| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| artist | string | |
| gpFilePath | string | Path to the source `.gp` file (pipeline output, pipeline.md) — one multi-track file per song, matching how Guitar Pro files are normally authored. Loaded once by the client and shared across every part; each `CatalogPart` selects a track within it via `trackIndex` |
| parts | CatalogPart[] | Instrument parts available for this song |
| lyricsLrc | string \| null | Path to the raw `.lrc` synced-lyrics file. Normally derived from the GP file's embedded lyrics (per-line end timestamps come from GP's last-syllable timing, encoded as blank-text gap lines), with lrclib.net consulted only for line-break placement if GP lacks it; falls back to an lrclib.net-sourced `.lrc` entirely when the GP file has no embedded lyrics at all. Null if no lyrics found either way. Drives the primary lyrics view's timing animation directly from `.lrc` timestamps. Gates whether `'lyrics'` is selectable as a part in the lobby (ui.md) |
| lyricsTrackIndex | number \| null | Index into `gpFilePath`'s parsed score identifying which track's beats actually carry the GP-embedded lyrics (`Beat.lyrics`) — the track lyrics were authored on, not necessarily any `CatalogPart.trackIndex` (the lyrics-bearing track may not be offered as a selectable instrument part at all). Null whenever `lyricsLrc` came from the lrclib.net fallback (no GP-embedded lyrics to point at). The client reads this track's beats at render time to derive syllable text + tick position for the in-tab overlay — no separate tick-map artifact is published (see Normalization Rules) |
| lyricsLineIndex | number \| null | Which index into a beat's `Beat.lyrics` array to read (`Beat.lyrics` is indexed by lyric line/channel — GP supports multiple simultaneous lyric channels, e.g. main vocal vs. a harmony line — not by syllable). Almost always `0`; the pipeline picks the first non-empty channel rather than the client guessing, in case a GP file's primary content isn't at index 0. Same nullability as `lyricsTrackIndex` |
| lyricLineBreaks | number[] \| null | Syllable count per line, in the order syllables appear across `lyricsTrackIndex`'s beats at `lyricsLineIndex` — lets the client regroup the flat per-beat syllable stream it reads from the parsed score back into lines matching `.lrc`, without the pipeline needing to publish tick positions itself. Same nullability as `lyricsTrackIndex` |

### CatalogPart

| Field | Type | Notes |
|-------|------|-------|
| id | string | Stable identifier; what `Participant.selectedPart` references for instrument parts |
| instrumentName | string | e.g. "Lead Guitar", "Bass" |
| trackIndex | number | Index into the track list of `CatalogSong.gpFilePath`'s parsed score — selects which track alphaTab renders/plays for this part. No per-density asset variant to store; bars-per-row density is a live alphaTab display setting applied at render time, not baked into the file. Percussion status (`staveProfile` selection, infrastructure.md) is read from the track's own parsed data (alphaTab exposes this natively — `track.percussionArticulations`/instrument metadata) rather than stored here, per constitution Principle V |

### PlaybackState

| Field | Type | Notes |
|-------|------|-------|
| status | 'stopped' \| 'running' \| 'paused' | |
| tickPosition | number | MIDI tick position — alphaTab's native score-position unit (`api.tickPosition`), instrument-agnostic and density-agnostic |
| bpm | number | Informational — current tempo for display (e.g. lobby/playback tempo readout). Not used for tick-to-time math; each client's alphaTab instance derives timing from the score's own tempo map |
| serverTimestamp | number | Wall-clock time this `tickPosition` was authoritative. Each participant's alphaTab instance (visible or headless, per ui.md) drives its own local clock from playback start and periodically re-syncs `tickPosition`/`timePosition` against this rather than being continuously driven by the server (infrastructure.md) |

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
