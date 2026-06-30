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
signals readiness. Shows live participant list with readiness state. Host
can remove participants. A "lobby cursor" lets the host point at a position
in the score for others to see before playback starts.

## Playback View

Synchronized scroll of the selected part's tab SVG, with an optional
lyrics overlay (syllable-level, beat-positioned) and an optional visual +
audible metronome. Host controls start/pause/resume/seek; a count-in
countdown can precede playback start. The host's view exposes seek
(click-to-position) when paused; participants' views don't.

## States

- **Loading**: tab SVG load is async per part; show a loading/readiness
  state per participant rather than blocking the whole lobby.
- **Empty**: no song selected yet — lobby shows the catalog picker only.
- **Error**: join-by-code failure (invalid/expired code), part-not-found,
  not-host action attempts — surfaced as toasts, not blocking modals.

Color, typography, tone, and motion are owned by `brand.md`, not this
artifact.
