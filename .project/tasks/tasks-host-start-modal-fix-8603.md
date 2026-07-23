---
plan: plan-host-start-modal-fix-2026-07-23-0a6a.md
generated: 2026-07-23
status: completed
---

# Tasks

## Phase 1: Server Auto-Resolve on Zero

- [x] T001 [artifacts: infrastructure] Write a failing test in `server/src/handlers/ready-set.test.ts` asserting: given a session with a pending start negotiation (`ctx.sessionStore.setPendingStart`) and exactly one not-ready connected participant, sending that participant's `ready-set { ready: true }` auto-resolves the negotiation — `resolvePendingStart`'s effect is observed as a `host-start-resolved { started: true }` message reaching the (now-empty) pending participants, `session.playbackState.status` becomes `'running'`, and `session.lobbyCursorTick`/`session.spotlightMode` reset per `runStartFlow`. Confirm it fails (current `handleReadySet` has no such logic).
- [x] T002 [artifacts: infrastructure] Implement the fix in `server/src/handlers/ready-set.ts`'s `handleReadySet`: after flipping the participant's readiness, check `ctx.sessionStore.getPendingStart(session.code)`; if a pending start exists, recompute the not-ready set among the pending participant IDs (still connected, still not `ready`) and, if it's now empty, call `resolvePendingStart(ctx, session, true)` then `runStartFlow(session)` (import both from `./playback-control.js`, mirroring the existing stale-retry branch in `handlePlaybackControl`) before the existing single `session-state` broadcast at the end of the function. Make T001 pass.
- [x] T003 [artifacts: infrastructure] [parallel] Write a failing test in `server/src/handlers/ready-set.test.ts` asserting the existing behavior is unchanged: a `ready-set` that does NOT bring a pending negotiation's not-ready count to zero (e.g. 2 pending, only 1 readies up) leaves the negotiation open — no `host-start-resolved` sent, `playbackState.status` unchanged. Confirm it fails only if the fix from T002 is missing the "count still > 0" guard, then verify it passes once T002 lands (no additional implementation expected — this is a regression guard for T002's guard clause).

## Phase 2: Client Modal Auto-Close Verification

- [x] T004 [artifacts: ui] [parallel] Write a failing (or newly-passing, if already covered) Playwright CT spec in `client/src/app-start-negotiation.ct.spec.ts` asserting: with the host's Start Negotiation confirmation modal open (`start-confirmation-needed` received), when a subsequent `session-state`/`host-start-resolved { started: true }` arrives reflecting the negotiation's auto-resolution (all participants now ready, playback running), the host's confirmation modal closes and the view transitions to Playback — with no intermediate stale "0 participants are not yet ready" render. If the existing modal-close logic (keyed off `host-start-resolved`/playback-state, per the pre-existing not-ready-participant auto-dismiss pattern) already covers this, this task confirms it passes with no client code change needed; if a gap is found (e.g. the host's own modal close was keyed off something else), fix it to make the test pass.
