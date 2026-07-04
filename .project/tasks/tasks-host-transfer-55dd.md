---
plan: plan-host-transfer-2026-07-03.md
generated: 2026-07-03
status: ready
---

# Tasks

## Phase 1: Shared transfer mechanics + datamodel

- [ ] T001 [artifacts: infrastructure] Extract the field swap currently
  inlined in `server/src/host-succession.ts`'s `promoteNextHost`
  (`host.role = 'member'; nextHost.role = 'host'; session.hostId =
  nextHost.id;`) into a new exported function
  `transferHost(session: Session, toParticipantId: string): void`. Update
  `promoteNextHost` to call it instead of inlining the swap. This is a
  pure refactor, not new behavior — per constitution Principle VII's
  research/refactor exception, no new test is required, but run
  `host-succession.test.ts` and confirm its existing promotion tests
  still pass unchanged as the confirming check.

- [ ] T002 [artifacts: datamodel] [parallel] Add `pendingHostRequest:
  string | null` to the shared `Session` type
  (`packages/shared/src/index.ts`) and to `server/src/session-store.ts`'s
  session-creation default (`null`). Test-first (constitution Principle
  VII): write a failing test asserting a newly-created session's
  `pendingHostRequest` is `null` by default, then add the field to make
  it pass.

## Phase 2: Server handlers (depends on T001, T002)

- [ ] T003 [artifacts: datamodel, infrastructure] Add `{ type:
  'host-delegate'; targetParticipantId: string }` to the `ClientMessage`
  union in `packages/shared/src/messages.ts`, and a new
  `server/src/handlers/host-delegate.ts` handler (model its shape on
  `host-remove-participant.ts`/`song-select.ts`). Test-first: write
  failing tests in `server/src/handlers/host-delegate.test.ts` for: a
  non-host sender is rejected with an error; targeting yourself is
  rejected; targeting a disconnected/nonexistent participant is rejected;
  a successful delegate calls `transferHost` (T001) and broadcasts
  `session-state`; delegating to the participant currently named in
  `pendingHostRequest` clears it to `null`; delegating to someone *other*
  than the pending requester leaves an existing `pendingHostRequest`
  untouched. Then implement the handler to pass them. Wire `case
  'host-delegate'` into `server/src/dispatch.ts` following the existing
  one-line-per-case pattern (Principle IV).

- [ ] T004 [artifacts: datamodel, infrastructure] Add `{ type:
  'request-host' }` to `ClientMessage` and a new
  `server/src/handlers/request-host.ts` handler. Test-first: failing
  tests for: a successful request sets `Session.pendingHostRequest` to
  the sender's id and broadcasts `session-state`; a sender who is already
  host is rejected; a sender is rejected if a *different* participant's
  request is already pending (same requester re-sending is not explicitly
  required to be idempotent — treat a same-requester re-send as also
  rejected, since the field is already set to their id and there's
  nothing new to do). Implement to pass, then wire `case 'request-host'`
  into `dispatch.ts` (sequenced after T003 — same file).

- [ ] T005 [artifacts: datamodel, infrastructure] Add `{ type:
  'host-request-decline' }` to `ClientMessage` and a new
  `server/src/handlers/host-request-decline.ts` handler. Test-first:
  failing tests for: a successful decline (sent by the current host)
  clears `pendingHostRequest` to `null` with no change to `hostId`/role
  and broadcasts `session-state`; a non-host sender is rejected; declining
  when nothing is pending (`pendingHostRequest` is already `null`) is
  rejected. Implement to pass, then wire `case 'host-request-decline'`
  into `dispatch.ts` (sequenced after T004 — same file).

- [ ] T006 [artifacts: infrastructure] [parallel] Update
  `server/src/server.ts`'s `close` handler: when the disconnecting
  participant's id matches `Session.pendingHostRequest`, clear it to
  `null` as part of the existing disconnect-triggered `session-state`
  broadcast (no separate new broadcast). Test-first: a failing test
  covering "requester disconnects while their request is still pending →
  `pendingHostRequest` resets to `null` and is included in the broadcast
  state," then implement to pass. Independent of T003-T005 (touches
  `server.ts`, not `dispatch.ts` or the new handler files) — only depends
  on T002's field existing.

## Phase 3: Client UI (depends on T003, T004, T005, T006)

- [ ] T007 [artifacts: ui] In `client/src/components/SettingsModal.svelte`'s
  Participants tab, add: (a) a host-only "Make host" button on every
  participant row except the viewer's own (visible only when the local
  client is host — reuse the existing `isHost` reactive), sending `{
  type: 'host-delegate', targetParticipantId: p.id }`; (b) an additional
  host-only "Decline" button that appears only on the row matching
  `Session.pendingHostRequest`, sending `{ type: 'host-request-decline'
  }`; (c) a "Request to become host" button on a non-host viewer's own
  row, sending `{ type: 'request-host' }`, disabled (not hidden) whenever
  `Session.pendingHostRequest` is non-null (to anyone); (d) a
  pending-request indicator replacing the normal readiness display on
  whichever row `pendingHostRequest` points to, for every non-host
  viewer who isn't the host (plain, non-interactive label). No local
  optimistic state update for any of these — the UI updates only once the
  resulting `session-state` broadcast arrives, matching every other
  action in this component (e.g. `toggleSpotlightMode`). Since no
  `SettingsModal.ct.spec.ts` exists yet, create one (follow
  `Bar.ct.spec.ts`'s harness-pairing pattern, checking whether a
  `SettingsModal.stories.svelte` needs setting up first) asserting: each
  control's visibility/disabled state is correct for host vs. non-host vs.
  the viewer's own row vs. the pending-request row, and clicking each
  sends the exact expected message on a mocked `wsClient`. Write this
  test first and confirm it fails before implementing the markup
  (constitution Principle VII).

## Phase 4: End-to-end confirmation (depends on T007)

- [ ] T008 [artifacts: ui] Extend `client/e2e/host-controls.spec.ts` (or
  `client/e2e/multi-participant.spec.ts` if that proves the better home —
  check both before choosing) with three scenarios driving real
  multi-participant sessions: (1) the host clicks "Make host" on another
  connected participant's row and confirms host-only controls (e.g. the
  Song & part control, or another "Make host" button) move to the new
  host and disappear from the old one; (2) a non-host clicks "Request to
  become host," the host clicks "Make host" on that participant's row,
  and the transfer completes exactly as in scenario 1 while
  `pendingHostRequest` clears; (3) a non-host requests, the host clicks
  "Decline," and confirms host privileges did *not* move and the request
  indicator clears without a transfer.
