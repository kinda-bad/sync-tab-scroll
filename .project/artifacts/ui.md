---
name: ui
status: stable
last_updated: 2026-06-30
diagram_stale: true
---

# UI

## Overview

Three-view flow: landing (create/join) → lobby (pick song/part, see who's
ready) → playback (synchronized scroll/lyrics/metronome view). View state
lives in the single client store (constitution principle I); components
don't hold their own nullable refs set as a side effect of framework
lifecycle hooks.

Client reactivity/templating is Svelte + Vite (plain Svelte, not
SvelteKit — see infrastructure.md).

## Landing View

Create a new session or join an existing one by code. Persists
session code + display name (e.g. to localStorage) so a refresh can
silently rejoin.

## Lobby View

Host picks a song from the catalog; each participant picks their part and
signals readiness. The part picker includes a **Lyrics** option alongside
the instrument parts — selectable like any other part, but disabled when
the song has no `.lrc` file (datamodel.md `CatalogSong.lyricsLrc`). The
in-tab lyrics overlay (Playback View, below) is gated separately on
`CatalogSong.lyricBeatMap` — in practice a song has both or neither, but
the two are independent fields and not guaranteed to co-occur. Shows live
participant list with readiness state. Host can remove participants. A
"lobby cursor" lets the host point at a position in the score for others
to see before playback starts.

## Playback View

Two renderings depending on the participant's selected part:

- **Instrument part selected**: synchronized scroll of that part's tab
  SVG, with an optional lyrics overlay (syllable-level, beat-positioned,
  from `CatalogSong.lyricBeatMap`) toggled on top.
- **Lyrics part selected**: no tab SVG. Full lyric text in large font,
  driven by `CatalogSong.lyricsLrc` line timestamps, with a timing
  animation (e.g. line-to-line highlight/transition) standing in for the
  scroll cursor an instrument view would otherwise show.

Both renderings share an optional visual + audible metronome. Host
controls start/pause/resume/seek; a count-in countdown can precede
playback start. The host's view exposes seek (click-to-position) when
paused; participants' views don't.

## States

- **Loading**: tab SVG load is async per part; show a loading/readiness
  state per participant rather than blocking the whole lobby. The lyrics
  part has no SVG to load, so it's ready as soon as the `.lrc` file is
  fetched.
- **Empty**: no song selected yet — lobby shows the catalog picker only.
- **Error**: join-by-code failure (invalid/expired code), part-not-found,
  not-host action attempts — surfaced as toasts, not blocking modals.

Color, typography, tone, and motion are owned by `brand.md`, not this
artifact.
