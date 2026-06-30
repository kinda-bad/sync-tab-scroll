---
name: datamodel
status: draft
last_updated: 2026-06-30
---

# Data Model

## Overview

Canonical entities carried forward from sync-scroll's domain — these shapes
were validated through 16 feature specs and aren't a source of the
complaints that motivated the rebuild, so they're captured here as known
domain knowledge. Storage/persistence mechanics are open (see
infrastructure.md).

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

### Participant

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| displayName | string | |
| role | 'host' \| 'member' | |
| connectionStatus | 'connected' \| 'disconnected' | Survives brief drops for reconnect |
| selectedPart | string \| null | Which instrument part they're following |
| readiness | ReadinessStatus | e.g. 'no-part' \| 'loading' \| 'ready' |

### CatalogSong / CatalogPart

| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| artist | string | |
| parts | CatalogPart[] | Per-instrument tab SVGs + density variants |

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

[OPEN: any additional normalization rules for the rebuilt pipeline's
output format, if it changes from the current LayoutMap shape.]

## Indexes

[OPEN: not yet relevant until persistence beyond in-memory session state is
decided.]
