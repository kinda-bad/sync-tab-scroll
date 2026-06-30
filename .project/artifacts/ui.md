---
name: ui
status: draft
last_updated: 2026-06-30
---

# UI

## Overview

Three-view flow carried forward from sync-scroll's domain knowledge:
landing (create/join) → lobby (pick song/part, see who's ready) →
playback (synchronized scroll/lyrics/metronome view). This shape wasn't a
source of complaints — the rebuild's UI principle is the same as the rest
of the app: keep view state in the single client store (constitution
principle I), don't reach into nullable module-level component refs set as
a side effect of framework lifecycle hooks.

[OPEN: Keep Alpine.js for client-side reactivity/templating? The old
codebase's actual `store.ts`/`session.ts` state containers were
well-built — the problem was bypassing them, not Alpine itself.]

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

[OPEN: light/dark theming — present in the old app as a later feature
add-on (spec 016). Decide whether this is in scope for initial rebuild or
a later feature on top of stable artifacts.]
