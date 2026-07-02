---
plan: plan-lobby-cursor-modes-2026-07-03.md
generated: 2026-07-02
status: in-progress
---

# Tasks

## Phase 1: Data model + shared types

- [x] T001 [artifacts: datamodel] Add `spotlightMode: boolean` to the `Session` type in `packages/shared/src/index.ts`, alongside the existing `lobbyCursorTick`/`metronomeEnabled`/`countInEnabled` fields. Default value is assigned wherever `Session` objects are constructed (session creation) — set it to `false` there, matching how `metronomeEnabled`/`countInEnabled` are defaulted.
- [x] T002 [artifacts: datamodel] [parallel] Add `{ type: 'spotlight-mode-set'; enabled: boolean }` as a new variant of `ClientMessage` in `packages/shared/src/messages.ts`, following the exact shape of the existing `{ type: 'lobby-cursor-set'; tickPosition: number | null }` entry.
- [x] T003 [artifacts: datamodel] Revise `datamodel.md`: add a `spotlightMode` row to the `Session` fields table (type `boolean`, default `false`, notes: "gates whether `lobbyCursorTick` force-follows participants (see ui.md); reset to `false` when playback starts, same as `lobbyCursorTick` resetting to `null`"). Update the existing `lobbyCursorTick` row's Notes to mention it only force-follows participants while `spotlightMode` is `true`. Bump `last_updated` to today's date.

## Phase 2: Server

- [ ] T004 [artifacts: datamodel] Create `server/src/handlers/spotlight-mode-set.ts`, mirroring `server/src/handlers/lobby-cursor-set.ts`'s structure exactly: look up the connection and session, reject with the same host-only error message pattern (`'Only the host can set Spotlight mode'`) if `session.hostId !== conn.participantId`, otherwise set `session.spotlightMode = message.enabled` and broadcast `session-state` via `ctx.connections.broadcast`.
- [ ] T005 Wire `handleSpotlightModeSet` into `server/src/dispatch.ts`'s message-type switch, alongside the existing `lobby-cursor-set` case.
- [ ] T006 In `server/src/handlers/playback-control.ts`'s `start` action case, add `session.spotlightMode = false` in the same block that already resets `lobbyCursorTick = null`.
- [ ] T007 Write a scripted WS integration test (following the existing pattern used for `lobby-cursor-set`, e.g. in `server/src/handlers/*.test.ts` or the project's existing WS test harness — locate it by searching for the `lobby-cursor-set` test) covering: (a) a non-host sending `spotlight-mode-set` receives the host-only error and `session.spotlightMode` is unchanged; (b) the host sending `spotlight-mode-set` with `enabled: true` results in a `session-state` broadcast with `spotlightMode: true`; (c) triggering `playback-control` `start` after that resets `spotlightMode` to `false` in the broadcast state. Confirm this test fails before T004-T006 are implemented (if written first) or passes immediately after (if written last, following T004-T006) — either order is acceptable for this task, but the test must be run and confirmed against the real handler code, not merely written.

## Phase 3: Client — force-follow effect + toggle UI

- [ ] T008 [artifacts: ui] In whichever module holds the persistent per-participant alphaTab instance and its `clientStore` subscriptions (`client/src/playback-engine.ts`, following the same pattern as the existing drift-correction subscription that calls `correctDrift`/`applyPlaybackSettings` from `client/src/playback-sync.ts`), add a subscription reacting to `session.lobbyCursorTick` changes: only when `session.spotlightMode === true`, set `api.tickPosition = session.lobbyCursorTick` (skip if `lobbyCursorTick` is `null`). When `spotlightMode` is `false`, the subscription must not touch `api.tickPosition` at all.
- [ ] T009 [artifacts: ui] In `client/src/views/Lobby.svelte`, add a host-only "Spotlight mode" toggle `Button` (reuse the existing `Button` component per `brand.md`'s established patterns) placed next to the existing "Set lobby cursor"/"Clear" controls. Clicking it sends `{ type: 'spotlight-mode-set', enabled: !session.spotlightMode }` over the client's websocket connection (following the same send pattern used by the existing lobby-cursor controls). Only render this toggle when the current participant is the host (mirror the existing host-only conditional already guarding the lobby-cursor controls).
- [ ] T010 Manual browser verification (two tabs/participants, both with a part selected so both have a rendered/persistent alphaTab instance per the existing T011c persistent-engine design): with Spotlight mode **off**, host sets the lobby cursor and confirm the other participant's view does not move. Toggle Spotlight mode **on**, host sets the lobby cursor again, confirm the other participant's view snaps to match. Host clicks Start, then Stop to return to Lobby, and confirm Spotlight mode has auto-reset to off (toggle UI shows off, and setting the lobby cursor again does not force-follow until re-enabled). Report results; do not mark this task complete until verified live, not just code-reviewed.

## Phase 4: Remaining artifact revisions

- [ ] T011 [artifacts: ui] Revise `ui.md`'s Lobby View section: describe the Spotlight-mode toggle (host-only) and that the lobby cursor only forces participants' views to follow while it's on; otherwise each participant browses independently. Bump `last_updated` to today's date and set `diagram_status: stale` if not already.
- [ ] T012 [artifacts: features] Revise `features.md`'s "Lobby cursor" entry to describe the conditional (Spotlight-mode-gated) behavior instead of the current "all participants see the same pointer" description — this is the resolution of `feedback-lobby-cursor-mode-e13b.md`'s Reconsidered item. Bump `last_updated` to today's date.
