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

Tab SVGs, layout maps, and lyrics data are not produced at runtime — they
come from an offline preprocessing pipeline and are served as static
assets. Pipeline stages, source format, on-disk layout, and dependency
handling are owned by `pipeline.md`, not this artifact.

## Production Posture

Self-hosted / small-group tool: no auth, no rate limiting. Session/
auth-adjacent code should still resolve "who is this participant" in one
place rather than scattering that assumption across handlers, so that
adding auth later is additive rather than a rewrite — but auth and rate
limiting themselves are out of scope for this build.
