---
plan: plan-lobby-cursor-race-2026-07-04.md
generated: 2026-07-04
status: in-progress
---

# Tasks

## Phase 1: Shared debounce helper

- [x] T001 [artifacts: constitution] Create `client/src/debounce.ts` exporting `function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T` — a trailing-edge debounce: each call resets a timer; `fn` is invoked with the *last* call's arguments once `ms` elapses with no further calls. Write a test first (`client/src/debounce.test.ts`, using the project's existing unit-test runner/fake-timers pattern — check an existing `client/src/*.test.ts` file for the harness convention already in use): assert that 3 rapid calls within the window result in exactly one invocation of `fn`, called with the arguments from the 3rd (last) call; assert calls spaced further apart than `ms` each fire independently.
  - Done. Used `toast-store.test.ts`'s `vi.useFakeTimers()`/`vi.advanceTimersByTime()` convention. Written first, confirmed red (module didn't exist), then implemented. 2/2 passing.

## Phase 2: Debounce click-to-seek broadcast

- [x] T002 [artifacts: ui] [parallel] In `client/src/playback-engine.ts`, locate the `api.playerPositionChanged.on((e) => { if (!e.isSeek) return; ...` listener (~line 157-163) that currently calls `wsClient.send({ type: 'playback-control', action: 'seek', tickPosition: e.currentTick })` synchronously and unconditionally once its guards pass. Wrap only that `wsClient.send(...)` call in a module-level `debounce(..., 150)` instance from T001's helper (create the debounced function once, outside the listener, e.g. alongside the other `let`/`const` declarations near `lastProgrammaticTick`— not re-created per event). Do not debounce the guard checks above it (`e.currentTick === lastProgrammaticTick`, host check) — those must still run synchronously per raw event, per the plan's note that `lastProgrammaticTick` comparisons are same-tick-sensitive.
  - Done as specified. `debouncedSendSeek` created once per engine instance (module-scope within `ensurePlaybackEngine`, alongside `lastProgrammaticTick`); the `isSeek`/`lastProgrammaticTick`/host guards still run synchronously per raw event, only the `wsClient.send(...)` call itself is wrapped.
- [x] T003 [artifacts: ui] Check `client/src/playback-engine.ct.spec.ts` for any existing test asserting a `wsClient.send` call happens synchronously/immediately after a seek event. If one exists, update it to account for the 150ms debounce (e.g. await a timeout, or use fake timers if the test harness supports them) rather than deleting the assertion. If no such test exists, add one: drive a seek, wait >150ms, assert exactly one `playback-control` seek message was sent.
  - No existing test asserted this. Added `'debounces rapid host seeks into a single broadcast carrying the last tick'`: triggers 3 rapid `isSeek: true` events (ticks 100/200/300) as host, waits 300ms, asserts exactly one `playback-control` `seek` message with `tickPosition: 300`. Passing.

## Phase 3: Debounce lobby-cursor-set send

- [x] T004 [artifacts: ui] [parallel] In `client/src/components/SettingsModal.svelte`, wrap `setLobbyCursor`'s body (`wsClient?.send({ type: 'lobby-cursor-set', tickPosition: lobbyCursorInput })`, line ~26-28) with the same `debounce(..., 150)` helper from T001 — create the debounced wrapper once at module/component scope (not inside the function body, so repeated calls actually coalesce against the same timer), keep `clearLobbyCursor` (line 30-32) undebounced since it's a single deliberate action, not a rapid-input path.
  - Done. `debouncedSetLobbyCursor` created once per component instance, takes the tick value as an explicit argument (not a closure over `lobbyCursorInput`) so "last call's arguments" semantics are exact. `clearLobbyCursor` untouched.
- [x] T005 [artifacts: ui] Check `SettingsModal.ct.spec.ts` for a test asserting `lobby-cursor-set` is sent immediately on clicking "Set lobby cursor". Update it to tolerate the 150ms debounce (await past the window before asserting), or add a new test if none currently covers this send path.
  - No existing test covered this path. Added `'rapidly clicking "Set lobby cursor" debounces to a single lobby-cursor-set send with the last value'`: fills the input and clicks Set three times rapidly (100/200/300), waits 300ms, asserts exactly one `lobby-cursor-set` message with `tickPosition: 300`. Passing.

## Phase 4: Manual verification

- [ ] T006 Manual verification in a real browser (two participants: host + joined member, both with a part selected). Host clicks 4-5 different spots on the tab notation in under a second; confirm the member's view settles directly on the last clicked position with no visible intermediate flicker, and no rapid re-render churn. Repeat using the "Set lobby cursor" input with rapid value changes and clicks. While there, resolve the plan's two open questions empirically rather than guessing: (a) confirm whether 150ms feels right — not laggy for a single deliberate click, but long enough to coalesce a rapid burst — adjust the constant in `debounce(..., 150)` call-sites if not; (b) confirm whether the host's own view flickers during their own rapid clicks (expected: no, since the host's `api.tickPosition` is driven directly by alphaTab's native click handling, not the broadcast round-trip) — note the actual observed behavior either way. Report results in this tasks file.
