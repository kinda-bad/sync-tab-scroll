---
status: draft
branch: host-transfer
created: 2026-07-03
features: [host-delegation, request-to-become-host]
---

# Plan: Host Transfer (delegation + request)

## Goal

Let host privileges move deliberately between connected participants
through two entry points — the host directly delegating to anyone, and a
non-host requesting and the host granting/declining — sharing one
transfer mechanism, per the `host-delegation` and `request-to-become-host`
feature entries.

## Background: why this plan replaces two independent drafts

`host-delegation` and `request-to-become-host` were each planned
independently (in parallel, in separate worktrees) before either could see
the other's work. Both ended up designing the identical `hostId`/`role`
field swap inline in their own handler — `host-delegate.ts` and
`host-request-respond.ts` respectively — which would have produced three
independent copies of the same logic alongside `host-succession.ts`'s
existing promotion step, a direct hit against constitution Principle II
("No Dead Architecture" / no duplicated mechanism). They also both edited
the same insertion point in `infrastructure.md` and the same bullet in
`ui.md`, which would have been a literal merge conflict had both branches
landed. This plan supersedes `plan-host-delegation-2026-07-03.md` and
`plan-request-to-become-host-2026-07-03.md` (both flipped to `superseded`
in their own branches) with a single reconciled design.

## Scope

**In scope:**
- `Session.pendingHostRequest` field (datamodel.md).
- `host-delegate { targetParticipantId }`, `request-host`, and
  `host-request-decline` messages and their server handlers
  (infrastructure.md).
- A shared `transferHost(session, toParticipantId)` function in
  `server/src/host-succession.ts`, exported and reused by `host-delegate`'s
  handler and by Host Succession's own existing promotion step (currently
  inlined in `promoteNextHost`) — one implementation of the hostId/role
  swap, not three.
- Participants-tab UI: host-only "Make host" control on every other row,
  a "Decline" control additionally on a row with a pending request,
  "Request to become host" on a non-host's own row, and a pending-request
  indicator visible to everyone (ui.md).
- Error-path handling for all of the above (ui.md States).

**Out of scope:**
- Any change to Host Succession's disconnect/grace-timer promotion
  trigger itself — both new entry points are additive alongside it, not a
  replacement.
- A timeout that auto-clears an unanswered `pendingHostRequest` — resolved
  as unnecessary for this app's small-group trust model (an ignored
  requester is only blocked from submitting a second request, not from
  anything else). Revisit if this proves annoying in practice.

## Technical Approach

**Shared mechanics** (`server/src/host-succession.ts`): extract the field
swap currently inlined in `promoteNextHost` (`host.role = 'member';
nextHost.role = 'host'; session.hostId = nextHost.id;`) into an exported
`transferHost(session: Session, toParticipantId: string): void`.
`promoteNextHost` calls it instead of inlining the swap; so does the new
`host-delegate` handler. This is the one substantive refactor this plan
requires before either new handler is written — do it first, confirm
`host-succession.test.ts` still passes unchanged, then build the new
handlers on top of it.

**Messages** (`packages/shared/src/messages.ts`, added to `ClientMessage`):
- `host-delegate { targetParticipantId: string }` — host-only (same
  authorization pattern as `playback-control`/`song-select`). Rejects:
  sender isn't host; target isn't an existing connected participant;
  target is the sender. On success: `transferHost(session,
  targetParticipantId)`, then if `session.pendingHostRequest ===
  targetParticipantId`, clear it to `null` (granting a pending request is
  just delegating to that participant — see infrastructure.md's Host
  Transfer for the full reasoning). Broadcast `session-state`.
- `request-host` (no payload) — rejects: sender is already host; a
  *different* request is already pending. On success: set
  `Session.pendingHostRequest` to the sender's id. Broadcast
  `session-state`.
- `host-request-decline` (no payload) — host-only. Rejects: nothing is
  pending. On success: clear `pendingHostRequest` to `null`, no transfer.
  Broadcast `session-state`.

**Disconnect handling** (`server/src/server.ts`'s `close` handler): if the
disconnecting participant is the one `Session.pendingHostRequest` points
to, clear it to `null` as part of the existing disconnect broadcast — no
new broadcast needed, piggyback on the one disconnect already triggers.

**Client UI** (`client/src/components/SettingsModal.svelte`, Participants
tab): per ui.md's merged description —
- Host view: "Make host" button on every row but their own; a row
  matching `pendingHostRequest` additionally shows "Decline".
- Non-host view: "Request to become host" on their own row, disabled
  while `pendingHostRequest` is non-null; the row matching
  `pendingHostRequest` shows a plain pending label instead of readiness,
  for every non-host viewer.
- All three new handler functions (`delegateHost`, `requestHost`,
  `declineHostRequest`) follow the existing pattern alongside
  `toggleSpotlightMode` — send the message, no local optimistic update
  (the resulting `session-state` broadcast is what actually updates the
  view for everyone, including the actor).

**Error surfacing**: the existing WS-client → toast pipeline (confirmed
in `ws-client.ct.spec.ts:68`) covers every rejection above with no new
plumbing.

## Phase Breakdown

### Phase 1 — Extract shared transfer mechanics
1. `[artifacts: infrastructure]` Extract `transferHost(session,
   toParticipantId)` from `promoteNextHost`'s inline swap in
   `server/src/host-succession.ts`; update `promoteNextHost` to call it.
   Test: `host-succession.test.ts`'s existing promotion tests still pass
   unchanged (this is a pure refactor, not new behavior — no new test
   required, constitution Principle VII's own research/refactor exception,
   but existing coverage must stay green as the confirming check).

### Phase 2 — Datamodel (depends on Phase 1 only for context, not code)
2. `[artifacts: datamodel]` Add `pendingHostRequest: string | null` to the
   shared `Session` type (`packages/shared/src/index.ts`) and to
   `server/src/session-store.ts`'s session-creation default (`null`).
   Test: a new session's `pendingHostRequest` is `null` by default.

### Phase 3 — Server handlers (depends on Phases 1-2)
3. `[artifacts: datamodel, infrastructure]` Add `host-delegate` to
   `ClientMessage` and `server/src/handlers/host-delegate.ts`. Test-first
   (Principle VII): non-host sender rejected; self-target rejected;
   disconnected/nonexistent target rejected; successful delegate calls
   `transferHost` and broadcasts; delegating to the pending requester
   clears `pendingHostRequest`; delegating to someone else leaves an
   existing pending request untouched. Route in `dispatch.ts`.
4. `[artifacts: datamodel, infrastructure]` [parallel with 3 is not
   possible — same `dispatch.ts` file, sequence after] Add `request-host`
   and `server/src/handlers/request-host.ts`. Test-first: success sets
   `pendingHostRequest`; already-host rejected; already-pending rejected.
   Route in `dispatch.ts`.
5. `[artifacts: datamodel, infrastructure]` [sequence after 4] Add
   `host-request-decline` and `server/src/handlers/host-request-decline.ts`.
   Test-first: success clears `pendingHostRequest` with no `hostId`
   change; non-host sender rejected; nothing-pending rejected. Route in
   `dispatch.ts`.
6. `[artifacts: infrastructure]` Update `server/src/server.ts`'s `close`
   handler to clear `pendingHostRequest` when the disconnecting
   participant is the one it points to. Test-first: requester disconnects
   mid-request → `pendingHostRequest` resets to `null` and is broadcast.

### Phase 4 — Client UI (depends on Phase 3)
7. `[artifacts: ui]` Add "Make host"/"Decline"/"Request to become host"
   controls and the pending-request indicator to
   `SettingsModal.svelte`'s Participants tab, per the Technical Approach
   above. Since no `SettingsModal.ct.spec.ts` exists yet, this task
   creates one (following `Bar.ct.spec.ts`'s harness pattern) asserting:
   controls appear/hide/disable correctly for host vs. non-host vs. the
   row itself, and each sends the expected message on the mocked
   `wsClient`. Write this test first and confirm it fails before
   implementing the markup, per Principle VII.

### Phase 5 — End-to-end confirmation (depends on Phase 4)
8. `[artifacts: ui]` Extend `client/e2e/host-controls.spec.ts` (or
   `multi-participant.spec.ts` — check which is the better home) with two
   scenarios driving real multi-participant sessions: (a) host delegates
   directly to another connected participant, confirming host-only
   controls move with the role; (b) a non-host requests, the host accepts
   by clicking "Make host" on that row, confirming the same transfer
   happens and `pendingHostRequest` clears; and a third case confirming
   "Decline" clears the request without transferring host.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| New session-wide field (`pendingHostRequest`) rather than a private per-connection message | Needed so every participant sees the same pending-request state consistently (constitution Principle I) — a host-only side-channel would let the host's and other participants' views of "is a request pending" drift. |
| Extracting `transferHost` as a new shared function rather than leaving `promoteNextHost`'s inline swap alone | Without it, this plan's own two new handlers would each reimplement the swap independently, exactly the duplication Principle II exists to prevent — this was the specific defect this plan exists to avoid, not a speculative refactor. |

## Open Questions

None blocking. The two questions the original independent plans left open
are resolved here:
- Whether `host-delegation` needs the target's consent (no) vs. whether it
  should reuse `pendingHostRequest`'s accept/decline flow (yes, but only
  by being the *same message* as a normal delegate, not a separate accept
  message) — resolved above, in Technical Approach.
- Whether `pendingHostRequest` needs a timeout — resolved as no, matching
  `request-to-become-host`'s original reasoning; noted as revisitable.

## Production Annotation Summary

None — no production shortcuts introduced. Host Transfer is checked the
same way every other host-only action already is (infrastructure.md
Production Posture); no new auth surface for this self-hosted trust model.
