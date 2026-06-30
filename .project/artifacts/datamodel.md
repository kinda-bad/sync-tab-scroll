---
name: datamodel
status: stable
last_updated: 2026-06-30
diagram_stale: true
---

# Data Model

## Overview

Canonical entities for sessions, participants, the song catalog, and
playback state. Storage/persistence mechanics are defined in
infrastructure.md (memory-only).

Lyrics exist in two forms per song: a raw `.lrc` file (line-level
timestamps, drives the primary lyrics view) and a pipeline-derived
`LyricBeatMap` (syllable-level, beat-positioned, drives the in-tab
overlay). Both are normally produced together, straight from lyrics
embedded in the source Guitar Pro file, including an accurate per-line end
timestamp (encoded as a blank-text LRC line) taken from the GP timing of
that line's last syllable — this end-timestamp accuracy is the reason
`.lrc` is GP-derived rather than taken from lrclib.net directly
(pipeline.md). lrclib.net plays two distinct, narrower roles: as a
line-break reference when GP has lyrics but no marked line boundaries
(GP timing still used throughout), and as a full fallback `.lrc` source
when GP has no embedded lyrics at all — only the fallback case leaves
`lyricBeatMap` null. The two fields are independent and not guaranteed to
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
| lobbyCursorBeat | number \| null | Beat position the host is pointing at pre-playback; null once playback starts |

### Participant

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| displayName | string | |
| role | 'host' \| 'member' | |
| connectionStatus | 'connected' \| 'disconnected' | Survives brief drops for reconnect |
| selectedPart | string \| 'lyrics' \| null | A `CatalogPart.id` for an instrument part, or the literal `'lyrics'` for the SVG-less lyrics part (ui.md). Not itself a `CatalogPart` entry — see CatalogSong's `lyricsLrc` |
| readiness | ReadinessStatus | e.g. 'no-part' \| 'loading' \| 'ready' |

### CatalogSong

| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| artist | string | |
| parts | CatalogPart[] | Instrument parts available for this song |
| lyricsLrc | string \| null | Path to the raw `.lrc` synced-lyrics file. Normally derived from the GP file's embedded lyrics (per-line end timestamps come from GP's last-syllable timing, encoded as blank-text gap lines), with lrclib.net consulted only for line-break placement if GP lacks it; falls back to an lrclib.net-sourced `.lrc` entirely when the GP file has no embedded lyrics at all. Null if no lyrics found either way. Drives the primary lyrics view's timing animation directly from `.lrc` timestamps. Gates whether `'lyrics'` is selectable as a part in the lobby (ui.md) |
| lyricBeatMap | LyricBeatMap \| null | Pipeline-derived, beat-positioned version of the same lyrics, used for the in-tab overlay. Only produced when lyrics came from the GP-embedded path — stays null when `lyricsLrc` came from the lrclib.net fallback, even though `lyricsLrc` itself is set (pipeline.md) |

### CatalogPart

| Field | Type | Notes |
|-------|------|-------|
| id | string | Stable identifier; what `Participant.selectedPart` references for instrument parts |
| instrumentName | string | e.g. "Lead Guitar", "Bass" |
| svgByDensity | Record<density, string> | Tab SVG path per density variant (pipeline output, pipeline.md) |
| layoutMapByDensity | Record<density, LayoutMap> | One `LayoutMap` per density variant, since coordinates differ per render |

### LyricBeatMap

| Field | Type | Notes |
|-------|------|-------|
| lines | LyricLine[] | |

### LyricLine

| Field | Type | Notes |
|-------|------|-------|
| text | string | Full line, for the primary lyrics view |
| syllables | LyricSyllable[] | Syllable breakdown, for the overlay |

### LyricSyllable

| Field | Type | Notes |
|-------|------|-------|
| text | string | |
| beatPosition | number | Same beat unit as `PlaybackState.beatPosition` |

### PlaybackState

| Field | Type | Notes |
|-------|------|-------|
| status | 'stopped' \| 'running' \| 'paused' | |
| beatPosition | number | Beats, not seconds — instrument-agnostic |
| bpm | number | |
| beatsPerSec | number | Derived from bpm |
| serverTimestamp | number | For client-side drift correction |

### LayoutMap

| Field | Type | Notes |
|-------|------|-------|
| svgWidth / svgHeight | number | |
| beatsPerBar | number | |
| measures | MeasureLayout[] | Each measure's x/y/width/row in SVG coords |
| staffY / staffHeight | number \| null | Used to position the scroll cursor on the staff lines |

## Normalization Rules

Position is tracked in **beats**, not wall-clock seconds, so the same
playback state maps correctly across parts with different note density
(e.g. switching from a 4-bars-per-row to 2-bars-per-row SVG render). Local
pixel positions are derived from beat position via the active part's
layout map at render time, not stored directly.

`LyricBeatMap` syllable positions are produced offline by the same
preprocessing pipeline that emits `LayoutMap` and tab SVGs (see
pipeline.md), not computed at runtime — keeping lyric-to-beat alignment
consistent with however the source Guitar Pro file defines timing,
independent of the `.lrc` file's own (coarser, line-level) timestamps —
and only when lyrics came from the GP-embedded path in the first place
(the lrclib.net fallback never produces a beat map).

`LayoutMap` is not an independent schema choice — it's the shape
pipeline.md's render stage already emits per density variant, so there's
no separate pipeline output format to reconcile against.

## Indexes

Not applicable — session state is in-memory only (infrastructure.md), with
no persistence layer or query surface that would require an index.
