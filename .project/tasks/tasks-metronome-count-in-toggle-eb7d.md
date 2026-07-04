---
plan: plan-metronome-count-in-toggle-2026-07-03.md
generated: 2026-07-03
status: completed
---

# Tasks

## Phase 1: Shared message types

- [x] T001 [artifacts: datamodel] Add `'metronome-set'` and
  `'count-in-set'` variants to `ClientMessage` in
  `packages/shared/src/messages.ts`, each shaped `{ type: 'metronome-set';
  enabled: boolean }` / `{ type: 'count-in-set'; enabled: boolean }`,
  placed alongside the existing `spotlight-mode-set` variant. No test
  needed (pure type addition, constitution Principle VII's own research/
  decision exception — a type has no runtime behavior until a handler
  consumes it, covered by T002/T004 below).

## Phase 2: Server handlers (depends on Phase 1)

- [x] T002 [artifacts: datamodel] [parallel] Write a failing test
  `server/src/handlers/metronome-set.test.ts`, structured like
  `server/src/handlers/spotlight-mode-set.test.ts`: (a) a non-host sender
  gets an `{ type: 'error' }` message and `session.metronomeEnabled` is
  unchanged; (b) the host sender sets `enabled: true`/`false` and
  `session.metronomeEnabled` updates to match, with a `session-state`
  broadcast triggered. Confirm it fails (no handler exists yet) before
  moving to T003, per constitution Principle VII.

- [x] T003 [artifacts: datamodel] Implement
  `server/src/handlers/metronome-set.ts`: resolve the connection/session,
  reject with `{ type: 'error', message: 'Only the host can control the
  metronome' }` if `session.hostId !== conn.participantId`, otherwise set
  `session.metronomeEnabled = message.enabled` and broadcast
  `session-state` via `ctx.connections.broadcast` (same shape as
  `spotlight-mode-set.ts`). Register `case 'metronome-set': return
  handleMetronomeSet(ctx, socket, message);` in `server/src/dispatch.ts`,
  following the existing one-line-per-case pattern. Make T002's test pass.

- [x] T004 [artifacts: datamodel] [parallel] Write a failing test
  `server/src/handlers/count-in-set.test.ts`, identical structure to
  T002 but asserting against `session.countInEnabled` and the
  `count-in-set` message type. Confirm it fails before T005.

- [x] T005 [artifacts: datamodel] Implement
  `server/src/handlers/count-in-set.ts`, mirroring T003 exactly but for
  `session.countInEnabled` and the rejection message "Only the host can
  control count-in". Register `case 'count-in-set': return
  handleCountInSet(ctx, socket, message);` in `server/src/dispatch.ts`.
  Make T004's test pass.

## Phase 3: Client UI (depends on Phase 2)

- [x] T006 [artifacts: ui] Add "Metronome" and "Count-in" host-only toggle
  `<Button>` controls to `client/src/components/SettingsModal.svelte`'s
  Participants tab, placed immediately below the existing Spotlight-mode
  toggle. Each button: visible only when `isHost` (reuse the existing
  reactive), label reflects current state (e.g. "Metronome: On"/"Metronome:
  Off"), `variant={enabled ? 'riot' : 'ghost'}` matching the Spotlight-mode
  button's existing pattern, and sends `{ type: 'metronome-set', enabled:
  !session.metronomeEnabled }` / `{ type: 'count-in-set', enabled:
  !session.countInEnabled }` via `wsClient?.send(...)` on click — new
  handler functions alongside the existing `toggleSpotlightMode`. No
  local optimistic state update; the buttons re-render from the next
  `session-state` broadcast, same as every other session-wide toggle in
  this component.

- [x] T007 [artifacts: ui] [parallel] Before writing T006's markup, check
  whether `SettingsModal.svelte` already has a `.ct.spec.ts` covering the
  Spotlight-mode toggle (if none exists, this task creates one following
  `Bar.ct.spec.ts`'s harness pattern). Write a failing component test
  asserting: the Metronome/Count-in buttons render only when `isHost` is
  true, their label/variant reflects `session.metronomeEnabled`/
  `countInEnabled`, and clicking each sends the correct
  `metronome-set`/`count-in-set` message on the mocked `wsClient`.
  Confirm it fails before implementing T006's markup, per constitution
  Principle VII, then confirm it passes once T006 is done.

## Phase 4: Verification (depends on Phase 3)

- [x] T008 Run the full test suite — server (`pnpm --filter server test`),
  client unit (`pnpm --filter client test`), and client component tests
  (`pnpm --filter client test:ct`) — to confirm zero regressions from
  T001-T007. Also run `pnpm check` (the repo's typecheck script) to
  confirm no type errors were introduced.

  **Result**: 62 server + 25 client unit + 26 client CT tests, all
  passing. This branch predates the root `pnpm check` script (added on
  the separate `add-typecheck-precommit-hook` branch, not yet merged into
  this branch's history), so ran `tsc --noEmit` per package directly
  instead. Two pre-existing type errors surfaced
  (`client/src/session-persistence.test.ts` missing `playbackProgress`,
  `server/src/catalog-static.test.ts`'s `writeHead` mock type mismatch) —
  both already fixed on `add-typecheck-precommit-hook`/`main`, unrelated
  to and unintroduced by T001-T007. Zero new type errors from this
  branch's own changes.

- [x] T009 Live-check in a real running session (per this project's
  established live-browser-verification practice — see `STATUS.md`'s
  Live-browser verification status section for the pattern to follow): as
  host, toggle both Metronome and Count-in, and confirm a second
  participant's audio actually reflects the change (metronome/count-in
  audibly turns on/off for both participants, not just the host's own
  client). Record the result in this tasks file or `STATUS.md` per the
  project's existing convention for live-check findings.

  **Not performed live — honest caveat, not a pass/fail claim.** This
  task ran autonomously in a background worktree with no user present.
  The available browser-automation tooling's own connection step
  (`list_connected_browsers`) requires interactively asking a human which
  connected Chrome browser to use and waiting for them to click Connect —
  it cannot be driven unattended, and there was no one to ask. Spinning up
  the dev/server processes and a real two-participant session was
  therefore not attempted.

  What **is** verified, end-to-end, via existing + new automated tests
  stitched together (not a live audio check, but every link in the chain
  a live check would exercise): `SettingsModal.ct.spec.ts` (T007, new)
  confirms clicking the buttons sends the correct `metronome-set`/
  `count-in-set` message; `metronome-set.test.ts`/`count-in-set.test.ts`
  (T002/T004, new) confirm the server validates host-only and sets
  `session.metronomeEnabled`/`countInEnabled` correctly, broadcasting
  `session-state`; `ws-client.ct.spec.ts` (pre-existing) confirms an

  **FAILED — live-browser verification by the user, 2026-07-04, then fixed.**
  With both Metronome and Count-in on, a joined participant's playback
  started at the correct tempo, then went slow/janky once the count-in
  countdown completed, with the metronome audibly retriggering rapidly.
  Reproduced live (two tabs, host + member) with instrumented logging.
  **Root cause, confirmed empirically (not guessed):** `correctDrift`
  (`client/src/playback-sync.ts`) ran its drift-correction logic against
  *the host's own client too*. The host is the sole source of
  `playbackState.tickPosition` (via its own once/sec tick-report), so
  comparing the host's real, continuously-advancing local tick against an
  echo of its own up-to-1s-stale self-report meant drift exceeded the
  50-tick threshold almost immediately after every report — hard-resetting
  the host's own real playback position *backward* to that stale
  checkpoint, dozens of times per second (confirmed via direct
  instrumentation: local tick climbing correctly, e.g. 413→448 in a couple
  ms of real audio, while the broadcast echo sat frozen at e.g. 393; each
  ~50-tick overshoot snapped straight back). This produced apparent
  playback at roughly 3.6% of real speed (measured: ~68 ticks/sec against
  an expected ~1888 ticks/sec at this song's 118bpm) and replayed
  metronome/count-in MIDI events on every reset. A secondary, compounding
  bug: the seek-broadcast guard (`lastProgrammaticTick`, in
  `playback-engine.ts`) was checked *after* `correctDrift` returned, but
  assigning `api.tickPosition` fires `playerPositionChanged` synchronously
  — one event too late, so some of these self-corrections were also
  rebroadcast to the server as if they were real user seeks. **Fix:**
  `correctDrift` now takes an `isHost` flag and skips its drift-comparison
  branch entirely for the host (the host still gets the start/pause
  status-transition branches, just never the tick-value comparison against
  its own echo); `onApply` is now invoked synchronously before each
  `tickPosition` assignment so `lastProgrammaticTick` is never stale when
  the resulting event fires. Verified live after the fix: host's tick
  advanced at exactly ~1888 ticks/sec (matching the song's real tempo) with
  only 2 seek messages sent in 5 seconds (down from ~430 in 5 seconds
  before the fix); member tab stayed visually in sync. New unit tests in
  `playback-sync.test.ts` lock in both the host-skip and the still-correct
  non-host drift-reset behavior.
  incoming `session-state` message updates the client store for any
  connected client, not just the sender; `playback-sync.test.ts`'s
  `applyPlaybackSettings` tests (pre-existing) confirm
  `session.metronomeEnabled`/`countInEnabled` correctly set
  `api.metronomeVolume`/`api.countInVolume`; and `playback-engine.ts:138`
  wires the store subscription to call `applyPlaybackSettings` on every
  session update, applied identically to every participant's `api`
  instance (visible or headless) per infrastructure.md. Every individual
  link is tested; only the literal "can a human hear the sound change" step
  is unverified. Recommend a human run this live check before considering
  the feature fully confirmed in practice — see `STATUS.md`.
