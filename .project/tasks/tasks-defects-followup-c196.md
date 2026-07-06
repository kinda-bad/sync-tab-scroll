---
plan: plan-defects-followup-2026-07-05.md
generated: 2026-07-06
status: in-progress
---

# Tasks

## Phase 1: Remove-participant control (client)
- [x] T001 [artifacts: ui] Write/extend `SettingsModal.ct.spec.ts` (failing
  first, per constitution Principle VII) covering: a "Remove" button
  renders in the Participants tab only for the host, only on other
  participants' rows (not the self row, not for non-hosts), and clicking
  it sends `{ type: 'host-remove-participant', participantId }`.
- [x] T002 [artifacts: ui] Add the "Remove" button to
  `SettingsModal.svelte`'s Participants tab (host-only, non-self rows,
  alongside the existing "Make host" button per `SettingsModal.svelte:101-
  103`), wired to a `removeParticipant(p.id)` function sending
  `host-remove-participant` — same authorization pattern as
  `delegateHost`/`requestHost` (`SettingsModal.svelte:66-72`). No
  confirmation dialog, no local optimistic update. Make T001 pass.
  (feedback: `feedback-defects-followup-743b.md`)

## Phase 2: Self-removal handling (client)
- [x] T003 [artifacts: infrastructure] Write a unit test (failing first,
  per constitution Principle VII), mirroring `leave-session.test.ts`'s
  pattern: simulate a `session-state` message whose
  `session.participants` no longer contains the current
  `selfParticipantId`, and assert: a toast fires ("You were removed from
  the session by the host"), the persisted session identity is cleared via
  `clearStoredSession()`, `clientStore` resets to the same shape
  `leaveSession()` uses (landing view, null session/selfParticipantId,
  empty catalog), and the socket's `close()` is called with no scheduled
  reconnect.
- [x] T004 [artifacts: infrastructure] Add the self-removal detection
  branch to `ws-client.ts`'s `message.type === 'session-state'` handler
  (`ws-client.ts:75-89`): if `message.selfParticipantId` is set, the
  store's `selfParticipantId` is also still set (idempotency guard), and
  `message.session.participants` no longer contains that id, treat this as
  self-removal. On detection: push the toast via `toastStore`
  (`ws-client.ts:92-95`'s existing mechanism), call
  `clearStoredSession()`, reset `clientStore` inline to
  `leaveSession()`'s reset shape (`leave-session.ts:15-24`) — do **not**
  call `leaveSession()` itself, since it calls `wsClient?.close()` and
  would re-enter this same `'close'` listener — set a new
  `suppressReconnect` closure flag in `createWsClient`, and check it in
  the existing `'close'` listener (`ws-client.ts:68-71`) before scheduling
  `setTimeout(attachSocket, ...)`. Make T003 pass.
  (feedback: `feedback-defects-followup-743b.md`)

## Phase 3: Artifact updates
- [x] T005 [artifacts: ui] [parallel] Document the new "Remove" control in
  `ui.md`'s Participants tab bullet list (host-only, non-self rows), and
  add a "Removed from session" entry under States (toast + reset to
  Landing).
- [x] T006 [artifacts: infrastructure] [parallel] In `infrastructure.md`:
  add a subsection near Host Transfer/Host Succession documenting
  `host-remove-participant` (host-only, filters the target from
  `Session.participants`, broadcasts `session-state` normally, plus the
  client-side self-removal handling from Phase 2); fix the
  percussion-detection wording to say `track.isPercussion`
  (`tab-renderer.ts:106`); add a mention of the small-screen render-scale
  (`tabScaleForViewportWidth`, `tab-renderer.ts:59-62`) to the Tab
  Rendering section.
- [x] T007 [artifacts: pipeline] [parallel] In `pipeline.md`, reword the
  lrclib-assisted-line-break branch to say lrclib supplies the lyric text
  in that branch and GP supplies only timestamps/line-break counts
  (matches `extract-lyrics.ts:59-62`, `lrc-writer.ts:17-35`).

## Phase 4: Verification
- [ ] T008 [artifacts: ui, infrastructure] Manually verify in a real
  browser with two clients: host removes a member; the removed member
  sees the toast, lands back on the Landing view, and does not silently
  reconnect into the same session.
- [ ] T009 Run the full test suite (server + client vitest, CT, e2e)
  before merging.
