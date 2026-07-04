---
status: approved
branch: hazard-bar-progress
created: 2026-07-03
features: []
---

# Plan: Hazard Bar Real Playback Progress

## Goal

Replace the Playback view's hardcoded `barProgress = 1` with the hazard
strip actually draining/filling to reflect real song position, using
alphaTab's existing `playerPositionChanged` event.

## Scope

**In scope:**
- A new `playbackProgress: number` (0–1) field on the existing single
  client store (`clientStore`, constitution Principle I), updated locally
  by each participant's own `playback-engine.ts` instance from alphaTab's
  `playerPositionChanged` event (`currentTime`/`endTime`, already
  available on every `PositionChangedEventArgs` — no new alphaTab API
  surface needed).
- `App.svelte`'s `barProgress` derivation reads this real value while in
  the Playback view instead of the hardcoded `1`.
  [feedback: hazard-bar-progress-4925 UX #1]

**Out of scope, deferred (not forgotten):**
- Any server-side/cross-participant synchronization of this value — it's
  a purely local rendering concern. Each participant's own alphaTab
  instance already advances independently (drift-corrected against the
  host, per `plan-playback-sync-fixes-2026-07-03.md`), so each
  participant's own hazard strip reflects their own instance's position —
  consistent with how the cursor itself already works, not a new sync
  concept.
- Resetting `playbackProgress` back to `0` explicitly on Stop — not
  needed structurally: `barProgress`'s existing ternary only reads
  `playbackProgress` while `view === 'playback'`; once back in the Lobby
  the readiness-ratio branch takes over and the stale value is simply
  never read again. Worth doing anyway for tidiness, included as a small
  part of the fix rather than a separate task.

## Technical Approach

**Where the value comes from**: `playback-engine.ts` already subscribes
to `api.playerPositionChanged` in two other places (lrc-line matching for
the headless lyrics view; seek-broadcast) — this adds a third, narrowly-
scoped subscription (matching the codebase's existing one-subscription-
per-concern style, not overloading an existing handler with an unrelated
responsibility). The new handler computes
`e.endTime > 0 ? e.currentTime / e.endTime : 0` (guarding the brief
window before the score is fully loaded and `endTime` is still `0`) and
writes it to `clientStore` via `clientStore.update(s => ({ ...s,
playbackProgress: ratio }))`. This subscription is registered
unconditionally (both instrument and lyrics parts — the headless player
is a real `AlphaTabApi` instance and fires the same event), not gated on
host/participant role, since this is purely a local "how far along is
my own view" readout, unlike the host-only tick-report
(`infrastructure.md`) which exists specifically to give the *server* an
authoritative value.

**Store shape**: `ClientState` (`client/src/store.ts`) already mixes
purely-local client state (`catalog`, `wsClient`) alongside
server-synced session state, per its own comment ("view routing state
and session state live here together") — adding `playbackProgress:
number` (default `0`) fits this established pattern directly, no new
store needed.

**Consuming it**: `App.svelte`'s existing `barProgress` derivation
(`$: barProgress = $clientStore.view === 'playback' ? 1 : totalCount > 0
? readyCount / totalCount : 0;`) changes its `'playback'` branch from the
literal `1` to `$clientStore.playbackProgress`.

## Phase Breakdown

### Phase 1: Wire real progress + test
- Add `playbackProgress: number` (default `0`) to `ClientState`
  (`client/src/store.ts`).
- Write a test first, following whatever testing paradigm
  `constitution.md`'s Quality Standards/Core Principles currently
  declare: extend `client/src/playback-engine.ct.spec.ts` — drive the
  mounted engine's `playerPositionChanged` (the harness's exposed
  `__getApi()` accessor already provides the real `api`, per the
  existing "reports tickPosition periodically" tests' pattern for
  driving/observing engine behavior) and assert `clientStore`'s
  `playbackProgress` updates to the expected `currentTime / endTime`
  ratio. Confirm it fails against the current code (no such field/update
  exists yet).
- Add the new `playerPositionChanged` subscription in
  `client/src/playback-engine.ts`'s `ensurePlaybackEngine()`, updating
  `clientStore.playbackProgress` as described in Technical Approach. Run
  the new test and confirm it passes.
- Update `App.svelte`'s `barProgress` derivation to read
  `$clientStore.playbackProgress` instead of the hardcoded `1` while in
  the Playback view.
- **[artifacts: ui]** No `ui.md` content change needed — the artifact
  never documented the hardcoded-`1` placeholder as intended design in
  the first place (it wasn't mentioned at all), so this is a pure
  implementation fix, not a design reversal. Confirmed rather than
  silently skipped, per the feedback item's own artifact tag.

### Phase 2: Manual verification
- Manual verification in a real browser (note: this one may actually be
  achievable despite the project's known audio-decode limitation — worth
  attempting rather than assuming it's blocked, since `playerPositionChanged`
  fires from alphaTab's internal transport/clock, which may advance
  independently of whether the *audio* itself ever actually plays; if it
  turns out the event genuinely never fires without real audio playback,
  that's itself worth confirming and noting explicitly rather than
  guessing): start playback and confirm the hazard strip visibly
  drains/fills as the song progresses, reaching (approximately) full at
  the song's end.

### Phase 3: Full suite verification
- Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and
  `pnpm --filter client test:e2e`. Confirm every test passes with no
  regressions. Report final test/file counts.

## Complexity Tracking

None — reuses the existing single-client-store pattern and the
established one-handler-per-concern subscription style; no new module,
no new sync mechanism.

## Open Questions

None outstanding.

## Production Annotation Summary

None anticipated.
