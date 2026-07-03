---
status: approved
branch: playback-sync-fixes
created: 2026-07-03
features: []
---

# Plan: Playback Sync Fixes

## Goal

Fix playback's "rubberbands to start" bug by making the host's client the
authoritative source of `PlaybackState.tickPosition` (the server can't
compute it itself — it never parses the GP file), and make the session's
join code always visible in the persistent Bar regardless of whether a
song is selected.

## Scope

**In scope:**
- A new host-only message the host's client sends periodically while
  playback is running, reporting its real `tickPosition`; the server
  stores and relays it via the existing periodic broadcast (unchanged).
- Revise `infrastructure.md` and `datamodel.md` to describe host-client
  authority instead of server-computed authority for `tickPosition`
  (`feedback-playback-sync-f03d.md`'s Reconsidered item).
- Fix `App.svelte`'s persistent-bar `identity()` snippet so the join code
  is always shown, not only before a song is selected
  (`feedback-playback-sync-f03d.md`'s Bug item).

**Out of scope, deferred (not forgotten):**
- `serverTimestamp`-based extrapolation on the receiving end to
  compensate for host→server→client propagation latency. Accepted as a
  manageable, minor imprecision for now, consistent with the existing
  50-tick drift tolerance and this app's small-scale self-hosted trust
  model — a future refinement if drift proves noticeable in practice,
  not required to ship this fix.
- Any change to the seek message/handler, or to `correctDrift()`'s
  client-side logic — both are already correct; the bug was purely that
  nothing kept the server's authoritative value moving.

## Technical Approach

**Root cause, confirmed by reading the code**: `server/src/server.ts`'s
periodic broadcast (the mechanism `infrastructure.md`'s Session &
Real-Time Sync section documents) refreshes `serverTimestamp` every
tick but never recomputes `tickPosition` while a session is `'running'`
— so it rebroadcasts the same frozen value from whenever playback
started or was last seeked. Every client's own alphaTab instance keeps
advancing locally in real time; the moment drift against that frozen
value exceeds `correctDrift()`'s threshold, the client snaps back to
it — repeating indefinitely. `correctDrift()` itself needs no changes;
it was already doing the right thing with wrong input.

**Why host-authoritative, not server-computed**: computing an
authoritative tick position from elapsed time requires knowing the
song's tempo/tick-rate (PPQ), which varies per GP file — and the server
never parses the GP file at all (only the client does, via alphaTab).
The host's client already has this. Rather than teaching the server
something it structurally can't know, the host's client becomes the
functional authority: it already has an accurate, continuously-advancing
`api.tickPosition` during real playback.

**New message, mirroring `lobby-cursor-set.ts`'s established shape**:
`{ type: 'playback-tick-report'; tickPosition: number }`
(`packages/shared/src/messages.ts`), host-only (same
`session.hostId !== conn.participantId` check as every other host-only
message), handled by a new `server/src/handlers/playback-tick-report.ts`
that sets `session.playbackState.tickPosition` and
`serverTimestamp = Date.now()`, then broadcasts — reusing the exact
broadcast call every other handler already uses. `server.ts`'s existing
periodic re-broadcast interval needs no changes at all; it already
disseminates whatever `session.playbackState` currently holds to every
participant on a fixed cadence. The only missing piece was something
keeping `tickPosition` itself moving, which this message provides.

**Client-side reporter**: in `client/src/playback-engine.ts`, a periodic
timer (established once per engine instance, alongside the existing
drift-correction subscription) sends the host's current `api.tickPosition`
every ~1 second while `isHost` and `session.playbackState.status ===
'running'` — checked fresh on each tick via the same `clientStore`
subscription pattern already used for drift correction, not a new
one-time computed condition. Deliberately does **not** gate on
`api.isReadyForPlayback` — that flag is about audio-decode readiness
(the same one documented in `playback-engine.ct.spec.ts`/
`tasks-lobby-cursor-modes-0bea.md`'s blocked T010 as unreachable under
browser automation); gating the reporter on it too would make this
logic untestable in CT for the same reason. In real production, by the
time the server's `status` is `'running'` at all, the host already
passed through the existing readiness flow, so this is a non-issue in
practice — just a deliberate choice to keep the reporter's own logic
testable independent of that known limitation.

**Session code visibility**: `App.svelte`'s `identity()` snippet
currently shows the join code only in the `{:else}` branch (no song
selected). Fix: always render the join code; render song name/artist
alongside it once a song is selected, rather than replacing it.

## Phase Breakdown

### Phase 1: Server-side tick relay
- Add `{ type: 'playback-tick-report'; tickPosition: number }` to
  `ClientMessage` (`packages/shared/src/messages.ts`).
- Add `server/src/handlers/playback-tick-report.ts` (host-only, mirrors
  `lobby-cursor-set.ts`), wire into `server/src/dispatch.ts`.
- Write a test first (Principle VII): mirroring
  `spotlight-mode-set.test.ts`'s pattern — non-host rejected, no state
  change; host's report updates `session.playbackState.tickPosition`
  and `serverTimestamp`, broadcasts. Confirm it fails before the handler
  exists, passes after.
- **[artifacts: infrastructure, datamodel]** Revise `infrastructure.md`'s
  Session & Real-Time Sync section and `datamodel.md`'s `PlaybackState`/
  `Session.playbackState` notes: the host's client is the functional
  authority for `tickPosition` (periodic self-report), not the server
  computing it independently — the server stores and relays what the
  host reports. `serverTimestamp`-based latency compensation noted as a
  deferred future refinement, not part of the current mechanism.

### Phase 2: Client-side periodic reporting
- Add the periodic host-report timer to `client/src/playback-engine.ts`,
  as described in Technical Approach above.
- Write a test first (Principle VII): extend
  `client/src/playback-engine.ct.spec.ts` using the existing
  `PlaybackEngineHarness`'s fake `wsClient` — drive `clientStore` to
  `isHost: true`, `playbackState.status: 'running'`, advance fake timers
  past the report interval, and assert `__sentMessages` contains a
  `playback-tick-report` with the real `api.tickPosition`. Also assert no
  report is sent when `isHost` is `false` or status isn't `'running'`.
  This is deliberately not audio-gated (see Technical Approach), so it
  isn't blocked by the known CT audio-worklet limitation.
- Manual verification in a real browser: host starts playback in a
  two-participant session; confirm the cursor now advances continuously
  without rubberbanding, for both the host and the other participant
  (whose own `correctDrift()` now has a genuinely moving value to
  correct against).

### Phase 3: Session code visibility
- **[artifacts: ui]** Fix `App.svelte`'s `identity()` snippet: always
  render `Join code: {session.code}`; render song name/artist alongside
  it (not instead of it) once a song is selected.
- Write a test first (Principle VII): extend one of the existing E2E
  specs (or add a small check to `client/e2e/single-participant.spec.ts`)
  asserting the join code text is visible both before and after song
  selection.
- **[artifacts: ui]** Add a brief note to `ui.md`'s existing persistent-bar
  mention (Lobby View section) describing that the join code is always
  shown in the bar's identity area, alongside song identity once
  selected. Bump `last_updated`.

### Phase 4: Full suite verification
- Run `pnpm --filter client test`, `pnpm --filter client test:ct`,
  `pnpm --filter client test:e2e`, and `pnpm --filter server test`;
  confirm no regressions, report final counts.

## Complexity Tracking

None — the new message/handler follows the exact established pattern
(`lobby-cursor-set.ts`), and the periodic reporter follows the existing
drift-correction subscription's shape.

## Open Questions

None outstanding — the host-authoritative model and its latency
trade-off were already discussed and agreed with the user before
drafting this plan.

## Production Annotation Summary

None anticipated.
