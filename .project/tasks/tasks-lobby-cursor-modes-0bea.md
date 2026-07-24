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

- [x] T004 [artifacts: datamodel] Create `server/src/handlers/spotlight-mode-set.ts`, mirroring `server/src/handlers/lobby-cursor-set.ts`'s structure exactly: look up the connection and session, reject with the same host-only error message pattern (`'Only the host can set Spotlight mode'`) if `session.hostId !== conn.participantId`, otherwise set `session.spotlightMode = message.enabled` and broadcast `session-state` via `ctx.connections.broadcast`.
- [x] T005 Wire `handleSpotlightModeSet` into `server/src/dispatch.ts`'s message-type switch, alongside the existing `lobby-cursor-set` case.
- [x] T006 In `server/src/handlers/playback-control.ts`'s `start` action case, add `session.spotlightMode = false` in the same block that already resets `lobbyCursorTick = null`.
- [x] T007 Write a scripted WS integration test covering: (a) a non-host sending `spotlight-mode-set` receives the host-only error and `session.spotlightMode` is unchanged; (b) the host sending `spotlight-mode-set` with `enabled: true` results in a `session-state` broadcast with `spotlightMode: true`; (c) triggering `playback-control` `start` after that resets `spotlightMode` to `false` in the broadcast state. **Resolved:** no test infrastructure existed anywhere in the repo (no test runner, no `*.test.ts` files) — user chose to stand up `vitest` in `server` (v2.1.9, matching the workspace's existing vite 5) as new project infrastructure rather than mirror a nonexistent prior test. `server/src/handlers/spotlight-mode-set.test.ts` written and passing (3/3) via `pnpm --filter server test`.

## Phase 3: Client — force-follow effect + toggle UI

- [x] T008 [artifacts: ui] In whichever module holds the persistent per-participant alphaTab instance and its `clientStore` subscriptions (`client/src/playback-engine.ts`, following the same pattern as the existing drift-correction subscription that calls `correctDrift`/`applyPlaybackSettings` from `client/src/playback-sync.ts`), add a subscription reacting to `session.lobbyCursorTick` changes: only when `session.spotlightMode === true`, set `api.tickPosition = session.lobbyCursorTick` (skip if `lobbyCursorTick` is `null`). When `spotlightMode` is `false`, the subscription must not touch `api.tickPosition` at all.
- [x] T009 [artifacts: ui] In `client/src/views/Lobby.svelte`, add a host-only "Spotlight mode" toggle `Button` (reuse the existing `Button` component per `brand.md`'s established patterns) placed next to the existing "Set lobby cursor"/"Clear" controls. Clicking it sends `{ type: 'spotlight-mode-set', enabled: !session.spotlightMode }` over the client's websocket connection (following the same send pattern used by the existing lobby-cursor controls). Only render this toggle when the current participant is the host (mirror the existing host-only conditional already guarding the lobby-cursor controls).
- [x] T010 [partial: scenario 3 now covered automatically; scenarios 1–2 still unverified] [blocked: browser automation unavailable] Manual browser verification (two tabs/participants, both with a part selected so both have a rendered/persistent alphaTab instance per the existing T011c persistent-engine design): with Spotlight mode **off**, host sets the lobby cursor and confirm the other participant's view does not move. Toggle Spotlight mode **on**, host sets the lobby cursor again, confirm the other participant's view snaps to match. Host clicks Start, then Stop to return to Lobby, and confirm Spotlight mode has auto-reset to off (toggle UI shows off, and setting the lobby cursor again does not force-follow until re-enabled). Report results; do not mark this task complete until verified live, not just code-reviewed. **Blocked during implementation:** the claude-in-chrome browser extension's `type` action failed repeatedly ("Cannot access a chrome-extension:// URL of different extension") across a fresh navigation and multiple retries — clicks/screenshots worked, typing didn't. Deferred at the user's direction (2026-07-02); dev servers were left running (client `:5180` via `pnpm --filter client dev --port 5180 --strictPort`, server `:8080` via `CATALOG_ROOT=<repo>/catalog pnpm --filter server dev`). Steps to verify manually: open `http://localhost:5180` in one tab (host, "Create session"), `http://127.0.0.1:5180` in another (join with the session code, avoids shared localStorage) — then follow the steps above.

## Phase 4: Remaining artifact revisions

- [x] T011 [artifacts: ui] Revise `ui.md`'s Lobby View section: describe the Spotlight-mode toggle (host-only) and that the lobby cursor only forces participants' views to follow while it's on; otherwise each participant browses independently. Bump `last_updated` to today's date and set `diagram_status: stale` if not already.
- [x] T012 Revise `features.md`'s "Lobby cursor" entry to describe the conditional (Spotlight-mode-gated) behavior instead of the current "all participants see the same pointer" description — this is the resolution of `feedback-lobby-cursor-mode-e13b.md`'s Reconsidered item. Bump `last_updated` to today's date.

> **T010 reconciled 2026-07-20** (`/ardd-implement --reconcile` equivalent,
> run as housekeeping). Checked against the codebase rather than re-asked
> of a human:
>
> - **Scenario 3 (Spotlight auto-resets when playback starts) — now
>   covered automatically.** `server/src/handlers/playback-control.ts:14`
>   sets `session.spotlightMode = false` on start, asserted by
>   `playback-control.test.ts:40` ("start sets status running and resets
>   lobbyCursorTick/spotlightMode"), with a companion test confirming
>   *resume* does not reset it. This scenario no longer needs a human.
> - **Scenarios 1–2 (Spotlight off ⇒ participant's view does NOT follow;
>   Spotlight on ⇒ it snaps) — still genuinely unverified.** No automated
>   coverage exists: `lobbyCursorTick` appears in
>   `playback-engine.ct.spec.ts` only as `null` fixture scaffolding
>   (line 125), never as an assertion, and no CT or e2e spec exercises the
>   force-follow path at `playback-engine.ts:470-474`.
>
> Deliberately **left unchecked**. The 2026-07-02 blocker (the
> claude-in-chrome `type` action failing) is stale — but the underlying
> behavior really has never been verified, by human or by test, so
> checking it off would be a false record. The cheap way to close this is
> CT coverage of the force-follow path rather than another manual pass;
> that is real work and belongs in a plan, not in a status edit.

> **T010 checked off 2026-07-24** via `plan-f841-2026-07-24-bdce.md` /
> `tasks-f841-8faf.md` (F001: live two-tab verification found scenario 2
> — Spotlight on ⇒ force-follow — genuinely broken in production, not
> just "unverified"; root-caused and fixed there).
>
> - **T001 (that plan's red-first CT spec)** reproduced the failure
>   deterministically: `client/src/spotlight-follow.ct.spec.ts` mounted
>   the real engine, drove `clientStore` to `spotlightMode: true` plus a
>   fresh `lobbyCursorTick`, and confirmed `api.tickPosition` never
>   settled on the target tick against pre-fix code.
> - **T002's diagnosis:** not the `isReadyForPlayback` gate and not
>   `clientStore.subscribe` failing to re-fire (both suspected, both
>   ruled out). Root cause was `correctDrift()` in
>   `client/src/playback-sync.ts` fighting the Spotlight-follow
>   assignment on every subsequent subscribe fire while
>   `playbackState.status === 'stopped'` (the pre-playback Lobby state
>   Spotlight targets) — via two sub-blocks: the stopped-state reset, and
>   (the dominant culprit) the drift-correction/extrapolation resync,
>   which re-snapped a non-host participant's tick back toward the stale
>   `playbackState.tickPosition` even while stopped/paused (deliberately,
>   so a host seek-while-paused still propagates, T011/F002).
> - **T003's fix:** exempted both `correctDrift` sub-blocks with a
>   boolean `spotlightHoldingTick` (`spotlightMode && lobbyCursorTick !==
>   null`) — boolean rather than an exact-tick comparison, since
>   alphaTab's own `tickPosition` setter doesn't round-trip exactly.
>   Scoped narrowly enough that scenarios 1 and 3 (both already passing)
>   are unaffected: spotlight off or reset ⇒ the exemption is `false` ⇒
>   `correctDrift` behaves exactly as before.
> - **T004:** full suite green — client vitest (153 tests), server
>   vitest (318 tests), client CT (232 tests, including a new scenario-1
>   CT assertion added alongside T001's spec).
> - **T005 (this task's live re-verification):** two real browser tabs
>   (`http://localhost:5180` host, `http://127.0.0.1:5180` participant,
>   both with a part selected, Brave "tester" profile via
>   claude-in-chrome) — host enabled Spotlight mode via the Settings
>   modal's Session tab, set the lobby cursor to tick 4800, and the
>   participant's alphaTab cursor visibly snapped from bar 1 to bar 2
>   (matching tick 4800) and stayed there under observation. **Pass** —
>   scenario 2 confirmed live, matching the CT coverage.
>
> Scenarios 1 and 3 were already covered (scenario 3 automatically per
> the 2026-07-20 note above; scenario 1 gained CT coverage in this same
> plan's T004). All three scenarios this task originally asked for are
> now verified, live or by test.
