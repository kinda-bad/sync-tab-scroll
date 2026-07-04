---
plan: plan-metronome-count-in-toggle-2026-07-03.md
generated: 2026-07-03
status: in-progress
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

- [ ] T008 Run the full test suite — server (`pnpm --filter server test`),
  client unit (`pnpm --filter client test`), and client component tests
  (`pnpm --filter client test:ct`) — to confirm zero regressions from
  T001-T007. Also run `pnpm check` (the repo's typecheck script) to
  confirm no type errors were introduced.

- [ ] T009 Live-check in a real running session (per this project's
  established live-browser-verification practice — see `STATUS.md`'s
  Live-browser verification status section for the pattern to follow): as
  host, toggle both Metronome and Count-in, and confirm a second
  participant's audio actually reflects the change (metronome/count-in
  audibly turns on/off for both participants, not just the host's own
  client). Record the result in this tasks file or `STATUS.md` per the
  project's existing convention for live-check findings.
