---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: host-start-modal-fix
created: 2026-07-23
features: []
surfaced-defects: []
---

# Plan: Auto-resolve stale host Start Negotiation modal

## Goal

Fix the host's Start Negotiation confirmation modal going stale — when
every not-ready participant readies up while the modal is still open, the
server auto-resolves the negotiation as a start-anyway confirm and
playback starts immediately, instead of leaving the host looking at a
"0 participants are not yet ready, start anyway?" prompt.

## Scope

**In scope:**
- Server: `handleReadySet` (`server/src/handlers/ready-set.ts`) detects
  when a `ready-set` brings a session's pending-start not-ready count to
  zero, and auto-resolves the negotiation via the existing
  `resolvePendingStart`/`runStartFlow` path (`playback-control.ts`).
- Client: confirm the host's confirmation modal closes as a consequence of
  the resulting `session-state`/playback-state broadcast (the same
  transition an explicit host confirm already produces) — no new client
  message type expected, but this needs a test to confirm no stale-modal
  regression at the client layer too.

**Out of scope:**
- Any other Start Negotiation behavior (the explicit host confirm/cancel
  path, the not-ready participants' own modal, disconnection-cancels-
  pending) — all already correct and unchanged.
- Any other open feedback or backlogged feature.

## Technical Approach

`playback-control.ts`'s `handlePlaybackControl` already has the reference
implementation for "auto-resolve started:true" — the existing stale-retry
branch (host presses Start again while everyone connected is now ready)
calls `resolvePendingStart(ctx, session, true)` then `runStartFlow(session)`
then broadcasts `session-state`. The fix reuses that exact sequence, but
triggers it from `handleReadySet` instead of waiting for the host to press
Start again: after flipping the participant's readiness, if a pending
start exists for the session (`ctx.sessionStore.getPendingStart`) and the
recomputed not-ready set (participants in the pending list still not
`ready` and still connected) is now empty, call
`resolvePendingStart(ctx, session, true)` and `runStartFlow(session)`
before the existing `session-state` broadcast — one broadcast covers both
the readiness flip and the start, matching the existing pattern of a
single broadcast per state transition. No new wire message is introduced;
`host-start-resolved { started: true }` is already sent by
`resolvePendingStart` to the (now-empty, but still-iterated) pending list,
so no client-side change should be needed — the host's own modal already
closes on `host-start-resolved`/the resulting playback-state change,
mirroring the existing not-ready-participant auto-dismiss. The client-side
task in Phase 2 exists to verify this rather than to add new UI logic.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is
tracked in the linked tasks file.

1. **Artifacts** (already applied this run): `infrastructure.md`'s Start
   Negotiation section and `ui.md`'s Start negotiation modals paragraph
   both updated to document the auto-resolve-on-zero behavior.
2. **Server: auto-resolve on zero** `[artifacts: infrastructure]` — extend
   `handleReadySet` to auto-resolve a pending start when the not-ready
   count reaches zero, reusing `resolvePendingStart`/`runStartFlow`.
   Addresses feedback-host-start-modal-stale-count-bc66 F001.
3. **Client: confirm modal auto-closes** `[artifacts: ui]` [parallel] —
   verify (via test) that the host's Start Negotiation modal closes once
   `host-start-resolved`/the resulting playback-state transition arrives,
   with no stale "0 not ready" render possible.

## Open Questions

None — the existing `resolvePendingStart`/`runStartFlow` path already
covers the resolution mechanics; this is a matter of triggering it from
one more call site.
