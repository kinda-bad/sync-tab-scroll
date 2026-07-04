---
plan: plan-server-failure-banner-2026-07-04.md
generated: 2026-07-04
status: ready
---

# Tasks

## Phase 1: Connection status tracking

- [ ] T001 [artifacts: infrastructure] Add `export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';` to `client/src/ws-client.ts`, and a `connectionStatus: ConnectionStatus` field to `ClientState` (`client/src/store.ts`), defaulting to `'connecting'`. Test-first (`client/src/store.test.ts`, new or extended): assert the default value. This is a plumbing-only task — no behavior wired yet, just the type/field existing.
- [ ] T002 [artifacts: infrastructure] Wire `createWsClient`'s socket to set `connectionStatus` on `clientStore`: `'connected'` on the socket's `open` event, `'disconnected'` on `error` or `close` (currently neither listener exists at all — confirmed by reading `ws-client.ts`). Test-first (`client/src/ws-client.test.ts`, new): spin up a real `WebSocketServer({port: 0})` (matching the existing pattern in `client/src/ws-client.ct.spec.ts`), assert `connectionStatus` transitions correctly through connect, and through a server-side close.

## Phase 2: Reconnect with retry + session reattachment

- [ ] T003 [artifacts: infrastructure] Depends on T002. Inside `createWsClient`, on `error`/`close`, start a fixed-interval retry (2s) that attempts `new WebSocket(url)` repeatedly until one successfully opens; on success, set `connectionStatus: 'connected'` and stop retrying (clear the interval/timeout). Test-first: using fake timers (`vi.useFakeTimers()`) and a real `WebSocketServer` that's stopped then restarted mid-test, assert reconnection succeeds and `connectionStatus` recovers to `'connected'` without a new `createWsClient()` call from the caller.
- [ ] T004 [artifacts: infrastructure] Depends on T003. On a *successful reopen that follows an already-established session* (not the first-ever connection attempt — distinguish via whether `clientStore`'s `session`/`selfParticipantId` are already set), explicitly re-send `{ type: 'session-join', code: session.code, participantId: selfParticipantId, displayName }` on the new socket, reusing `server/src/handlers/session-join.ts`'s existing `existing`-participant reclaim branch (same mechanism the refresh-reconnect path already uses — do not add a second reattachment mechanism). Test-first: assert this message is sent on the second reconnect in a test scenario with two consecutive server restarts, and NOT sent on the very first connection (where the original join/create message is still sitting in `pending`, per the plan's Technical Approach).

## Phase 3: ConnectionBanner component

- [ ] T005 [artifacts: ui] [parallel] Create `client/src/components/ConnectionBanner.svelte`: renders a persistent, non-dismissing banner (no close button) whenever `$clientStore.connectionStatus !== 'connected'`, styled with `--riot`/`--riot-dim` (brand.md's existing error-accent token, already used for `Toasts.svelte`'s left-border), fixed to the top of the viewport, `z-index: 1010`+ (clears alphaTab's `.at-cursors` at 1000 and `.lyrics-overlay` at 1001, matching `Modal.svelte`/`Toasts.svelte`'s existing convention). Depends only on T001 (the `connectionStatus` field existing) — can run in parallel with T002-T004 since it touches a different file. Test-first (CT spec, `client/src/components/ConnectionBanner.ct.spec.ts`, new): mount with a harness driving `clientStore.connectionStatus` through each value, assert visibility toggles correctly and there's no dismiss control.
- [ ] T006 [artifacts: ui] Depends on T005. Mount `<ConnectionBanner />` unconditionally in `client/src/App.svelte` (same always-rendered pattern as `<Toasts />` — not gated on `view`, since the bug reproduces on the Landing view specifically).

## Phase 4: e2e coverage

- [ ] T007 [artifacts: ui, infrastructure] Depends on T003, T004, T006. New e2e spec (`client/e2e/connection-banner.spec.ts`): start a session normally, stop the real test server process mid-test (or redirect the client at a killed/nonexistent port), assert the banner becomes visible; restart the server, assert the banner disappears and the session is still usable (participant reattached, per T004) without a page reload. Also cover the load-time case: point a fresh page load at a down server, assert the banner appears (covers `Landing.svelte`'s auto-reconnect-on-load path, the specific scenario from the original feedback).

## Phase 5: Artifact updates

- [ ] T008 [artifacts: ui] Update `.project/artifacts/ui.md`'s **States** section: add the persistent connection-failure banner as a distinct case alongside the existing WS-message-level Error state (toasts) — total server unreachability is not a toast, it's a persistent banner that clears on its own. Update frontmatter (`last_updated`, `diagram_status: stale` if not already `unrendered`).
- [ ] T009 [artifacts: infrastructure] Update `.project/artifacts/infrastructure.md`: document the reconnect-with-retry mechanism (fixed 2s interval, no backoff — per the plan's Open Questions, a deliberate simplicity choice for this project's self-hosted/small-group scale) and its reuse of `session-join.ts`'s existing reconnect-by-participantId path, alongside the current Session & Real-Time Sync section. Update frontmatter (`last_updated`, `diagram_status: stale` if not already `unrendered`).

## Phase 6: Verification

- [ ] T010 Run the full suite: `pnpm -r --if-present run check` (typecheck), client vitest, server vitest, `npx playwright test --project=ct`, `npx playwright test --project=e2e` — confirm all green. Record actual pass counts in this task's completion note (this project's established convention — see e.g. `tasks-metronome-count-in-toggle-eb7d.md`). Then attempt a live manual check (start both dev servers, kill the server process, confirm the banner appears in a real browser; restart it, confirm the banner clears) — if not performed, say so explicitly with reasoning, don't mark it silently skipped.
