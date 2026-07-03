---
plan: plan-hazard-bar-progress-2026-07-03.md
generated: 2026-07-03
status: ready
---

# Tasks

## Phase 1: Wire real progress + test

- [x] T001 Add `playbackProgress: number` (default `0`) to `ClientState` in `client/src/store.ts`, and to the initial state object `createClientStore()` constructs.

  Added as described, with a doc comment explaining it's local-per-participant and consumed by `App.svelte`'s hazard-strip fill.

- [x] T002 [artifacts: infrastructure] Write a test first, following whatever testing paradigm `constitution.md`'s Quality Standards/Core Principles currently declare: extend `client/src/playback-engine.ct.spec.ts`. Mount `PlaybackEngineHarness` (mirroring the existing "reports tickPosition periodically while host and running" test's setup — wait for the tab container's `svg` to be visible so the score/duration is loaded), then via `page.evaluate` call `__getApi().tickPosition = <some nonzero value less than the score's total ticks>` (the harness already exposes `__getApi()`, returning the real alphaTab `api`; setting `tickPosition` directly is the same mechanism `correctDrift`'s own code already relies on to fire `playerPositionChanged`, per that function's existing comment). Poll (via `expect.poll`, matching this file's existing polling style) `__clientStore`'s current `playbackProgress` value (the harness already exposes `__clientStore` — read its current value via `get(store)` from `svelte/store` inside the page context, or subscribe-and-immediately-unsubscribe, whichever the harness's existing exposure pattern makes easiest) until it's greater than `0` and matches the real `api`'s `currentTime / api.masterBarsRenderedRange`-equivalent — pragmatically, assert it equals whatever ratio the production code is expected to compute (`currentTime / endTime` from the fired event) rather than hand-deriving an independent expected value, to keep the test resilient to exact tick/time numbers. Also assert `playbackProgress` is `0` immediately after mount, before any tick is set. Confirm this test fails against the current code (no such field/update exists yet — `clientStore` has no `playbackProgress` key at all before T001, and no subscription updates it before T003).

  Added `tracks real playbackProgress in clientStore from playerPositionChanged` test, using the subscribe-and-immediately-unsubscribe pattern for reading current store value (mirroring the harness's `__clientStore` exposure). Confirmed red: `expect.poll(...).toBeGreaterThan(0)` timed out at 5s, `playbackProgress` stayed `0` — expected, since `ClientState` has no such key updated anywhere yet.

  **Deviation found while writing the test:** the task's prescribed driving mechanism (`api.tickPosition = <value>` firing `playerPositionChanged` with a real `currentTime`/`endTime`, "the same mechanism `correctDrift` relies on") does not hold empirically under this CT environment. Verified directly: attaching a listener and setting `tickPosition` (even after calling `api.play()`, waiting up to 8s) only ever re-fires the stale all-zero initial event; `api.endTick`/`api.endTime` never leave `0` either, even after 10s of polling. Root cause: real position broadcasts require alphaTab's synth *worker* to actually be running a playback loop and post an `alphaSynth.positionChanged` message back — that never happens under browser automation, one level deeper than (but consistent with) this file's already-documented `isReadyForPlayback`/`soundFontLoaded` limitation. Switched the test to call `api.playerPositionChanged.trigger(...)` directly instead — the same public method alphaTab's own worker-message handler uses internally to fire this event (confirmed in `node_modules/@coderline/alphatab/dist/alphaTab.js`) — injecting a known `currentTime: 5, endTime: 10` pair and asserting the production handler computes `0.5`. This still exercises the real production `.on()` handler in `playback-engine.ts`, just without depending on real audio/synth-loop emission — consistent with this file's established "test what CT can drive, leave real emission to manual verification" split. Confirmed red again against pre-T003 code with this new driving mechanism (temporarily reverted `playback-engine.ts`, reran, timed out as expected) before implementing T003.

- [x] T003 [artifacts: infrastructure] In `client/src/playback-engine.ts`'s `ensurePlaybackEngine()`, add a new `api.playerPositionChanged.on((e) => { ... })` subscription (a new, narrowly-scoped one — do not fold this into the existing lrc-line-matching or seek-broadcast subscriptions, matching this file's established one-handler-per-concern style) that computes `const ratio = e.endTime > 0 ? e.currentTime / e.endTime : 0;` and calls `clientStore.update((s) => ({ ...s, playbackProgress: ratio }))`. Register this subscription unconditionally (both instrument and lyrics/headless parts fire the same event on a real `AlphaTabApi` instance) — not gated on host/participant role, since this is a purely local per-participant rendering concern, unlike the host-only tick-report. Run T002's test and confirm it passes.

  Implemented exactly as described — a third, standalone `api.playerPositionChanged.on(...)` subscription in `ensurePlaybackEngine()`, unconditional, computing `e.endTime > 0 ? e.currentTime / e.endTime : 0` and writing it via `clientStore.update`. T002's test passes (see T002's note for the driving-mechanism deviation). Full `test:ct` suite (21 tests) passes with no regressions.

- [x] T004 In `client/src/App.svelte`, change the `barProgress` derivation's `'playback'` branch from the literal `1` to `$clientStore.playbackProgress`: `$: barProgress = $clientStore.view === 'playback' ? $clientStore.playbackProgress : totalCount > 0 ? readyCount / totalCount : 0;`.

  Changed exactly as described; also updated the adjacent comment (previously explaining the "1"/"live" placeholder) to describe the real tracking now in place.

- [x] T005 [artifacts: ui] No `ui.md` content change needed — confirm rather than silently skip: `ui.md` never documented the hardcoded-`1` placeholder as intended design (it wasn't mentioned there at all), so this is a pure implementation fix bringing the code in line with what a "playback progress" bar should already do, not a documented-design reversal requiring an artifact edit.

  Confirmed via `grep -rn "barProgress\|hazard" .project/artifacts/ui.md` — no reference to the hardcoded-1 placeholder exists in `ui.md`. No artifact edit needed.

## Phase 2: Manual verification

- [ ] T006 Manual verification in a real browser: start playback and confirm the hazard strip visibly drains/fills as the song progresses, reaching (approximately) full near the song's end. Note for whoever runs this: this specific check may actually be achievable despite this project's known audio-decode-never-resolves limitation, since `playerPositionChanged` fires from alphaTab's internal transport/clock and may advance independently of whether real audio output ever actually plays — attempt it rather than assuming it's blocked. If the event genuinely never fires without real audio, confirm and note that explicitly (with what was actually observed) rather than guessing.

## Phase 3: Full suite verification

- [ ] T007 Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and `pnpm --filter client test:e2e`. Confirm every test passes with no regressions. Report final test/file counts.
