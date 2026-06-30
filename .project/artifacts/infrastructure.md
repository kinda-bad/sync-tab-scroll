---
name: infrastructure
status: stable
last_updated: 2026-06-30
diagram_stale: true
---

# Infrastructure

## Overview

Real-time client-server sync over WebSocket: a session host controls
playback (start/pause/resume/seek), and the server is the authoritative
clock, broadcasting position updates to all participants in a session. Tab
SVGs are not rendered at runtime — they're generated ahead of time by an
offline preprocessing pipeline from Guitar Pro source files and served as
static assets.

Stack: pnpm workspace monorepo (`client`/`server`/`packages/shared`), Node
+ `ws` for the WebSocket server — both carried forward unchanged, neither
was a source of complaints.

Client reactivity/templating switches from Alpine.js to **Svelte + Vite**
(plain Svelte, not SvelteKit — the app is one page with view-state
switching between landing/lobby/playback handled by the client store, not
separate routes, so SvelteKit's routing/SSR machinery isn't needed). This
isn't a quality fix — Alpine wasn't the problem, the store/session
containers built on it were already well-designed — it's a deliberate
choice to work in a framework with real component composition for the
rebuild. The store/session-state design (single source of state, per
constitution principle I) carries forward regardless of framework.

## Session & Real-Time Sync

The server owns session state (participants, selected song/part, playback
clock) and is the source of truth for "what beat are we on right now."
Clients reconcile their local scroll position against periodic
server-broadcast position updates, snapping when drift exceeds a threshold
rather than trusting purely local timers.

Sessions stay server-memory-only, same as sync-scroll: a grace-period
timer destroys empty sessions, and a server restart drops active ones.
No durable backing store for session state in this rebuild.

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

Guitar-Pro-as-source-of-truth, `@coderline/alphatab` for SVG rendering,
and the lrclib.net lyrics-lookup step are all kept unchanged. None of
these were complaints — the problem was the undocumented MIDI→GP pivot
leaving dead remnants behind, not the GP approach itself.

## Production Annotations

Self-hosted / small-group tool for now — no auth, no rate limiting, same
trust model as sync-scroll. Hardening (auth, rate limiting) is a real
future direction, not ruled out, but out of scope for this rebuild.
Practically: don't design session/auth-adjacent code in a way that makes
adding auth later a rewrite (e.g. keep "who is this participant"
resolution in one place rather than scattered ws-handler assumptions),
but don't build the hardening itself now.

This also resolves constitution.md's open deployment-scope question —
self-hosted/small-group, not public/untrusted traffic.
