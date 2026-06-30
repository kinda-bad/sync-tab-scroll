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
+ `ws` for the WebSocket server, **Svelte + Vite** for client
reactivity/templating (plain Svelte, not SvelteKit — the app is one page
with view-state switching between landing/lobby/playback handled by the
client store, not separate routes, so SvelteKit's routing/SSR machinery
isn't needed).

## Session & Real-Time Sync

The server owns session state (participants, selected song/part, playback
clock) and is the source of truth for "what beat are we on right now."
Clients reconcile their local scroll position against periodic
server-broadcast position updates, snapping when drift exceeds a threshold
rather than trusting purely local timers.

Sessions are server-memory-only: a grace-period timer destroys empty
sessions, and a server restart drops active ones. No durable backing
store for session state.

## Tab Rendering Pipeline

A separate offline pipeline converts a source music file into tab SVGs plus
a layout map (beat → x/y coordinates) consumed by the client's scroll
engine. The pipeline reads Guitar Pro (`.gp`) files directly as the source
format, since GP files carry fingering/string-assignment/track-name data
that other formats (e.g. MIDI) can't represent. Rendering uses
`@coderline/alphatab` to produce SVGs; a lyrics-sourcing step queries
lrclib.net for synced lyrics where available.

Per the constitution's "No Dead Architecture" principle: the pipeline
directory contains only the current approach — no unused virtual
environments, no vendored tools with their own nested `.git`, no
package.json scripts pointing at files that don't exist, no README claims
that don't match what's on disk. Anything vendored is either committed
clean or pulled in as a real dependency.

## Production Posture

Self-hosted / small-group tool: no auth, no rate limiting. Session/
auth-adjacent code should still resolve "who is this participant" in one
place rather than scattering that assumption across handlers, so that
adding auth later is additive rather than a rewrite — but auth and rate
limiting themselves are out of scope for this build.
