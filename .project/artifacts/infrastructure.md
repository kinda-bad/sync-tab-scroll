---
name: infrastructure
status: draft
last_updated: 2026-06-30
---

# Infrastructure

## Overview

Real-time client-server sync over WebSocket: a session host controls
playback (start/pause/resume/seek), and the server is the authoritative
clock, broadcasting position updates to all participants in a session. Tab
SVGs are not rendered at runtime — they're generated ahead of time by an
offline preprocessing pipeline from Guitar Pro source files and served as
static assets.

[OPEN: Keep the prior stack (pnpm workspace monorepo with
`client`/`server`/`packages/shared`, Node + `ws` for the WebSocket server,
Alpine.js for client reactivity) or reconsider any of these? None of these
were named as quality complaints in the old codebase — the complaints were
about how state/modules were organized, not the choice of Alpine or `ws` —
so the default is to carry them forward unless you want to revisit.]

## Session & Real-Time Sync

The server owns session state (participants, selected song/part, playback
clock) and is the source of truth for "what beat are we on right now."
Clients reconcile their local scroll position against periodic
server-broadcast position updates, snapping when drift exceeds a threshold
rather than trusting purely local timers.

[OPEN: Session persistence — sync-scroll kept sessions in server memory
only (a grace-period timer destroyed empty sessions). Confirm that's still
acceptable, or does this rebuild need sessions to survive a server
restart?]

## Tab Rendering Pipeline

A separate offline pipeline converts a source music file into tab SVGs plus
a layout map (beat → x/y coordinates) consumed by the client's scroll
engine. The prior pipeline pivoted from MIDI-derived rendering to reading
Guitar Pro (`.gp`) files directly, since GP files carry fingering/string
assignment/track-name data that MIDI can't represent.

Per the constitution's "No Dead Architecture" principle: when this pipeline
is rebuilt, no remnants of an earlier rendering approach (unused venvs,
vendored tools with their own `.git`, stale package.json scripts, dead
README references) carry over into the new repo. Anything vendored is
either committed clean or pulled in as a real dependency.

[OPEN: Keep Guitar-Pro-as-source-of-truth? Keep the same library
(`@coderline/alphatab`) for SVG rendering? Keep the lyrics-sourcing step
(lrclib.net lookup)?]

## Production Annotations

[OPEN: not yet discussed whether this targets self-hosted/personal use or
needs production hardening (auth, rate limiting, persistence beyond
in-memory). Fill in once scope is confirmed.]
