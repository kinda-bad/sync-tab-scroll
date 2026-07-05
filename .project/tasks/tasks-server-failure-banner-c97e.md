---
plan: plan-server-failure-banner-2026-07-04.md
generated: 2026-07-04
status: completed
---

# Tasks

## Phase 1: Connection status tracking

- [x] T001 [artifacts: infrastructure] Add `export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';` to `client/src/ws-client.ts`, and a `connectionStatus: ConnectionStatus` field to `ClientState` (`client/src/store.ts`), defaulting to `'connecting'`. Test-first (`client/src/store.test.ts`, new or extended): assert the default value. This is a plumbing-only task — no behavior wired yet, just the type/field existing.
  - Done. `ConnectionStatus` type and `ClientState.connectionStatus` field exist, default `'connecting'`, covered by `client/src/store.test.ts`.
- [x] T002 [artifacts: infrastructure] Wire `createWsClient`'s socket to set `connectionStatus` on `clientStore`: `'connected'` on the socket's `open` event, `'disconnected'` on `error` or `close` (currently neither listener exists at all — confirmed by reading `ws-client.ts`). Test-first (`client/src/ws-client.test.ts`, new): spin up a real `WebSocketServer({port: 0})` (matching the existing pattern in `client/src/ws-client.ct.spec.ts`), assert `connectionStatus` transitions correctly through connect, and through a server-side close.
  - Done. Covered by `client/src/ws-client.ct.spec.ts`'s "connectionStatus becomes connected once the socket opens" / "...disconnected when the server closes the connection" / "...disconnected when the socket never connects at all" tests.

## Phase 2: Reconnect with retry + session reattachment

- [x] T003 [artifacts: infrastructure] Depends on T002. Inside `createWsClient`, on `error`/`close`, start a fixed-interval retry (2s) that attempts `new WebSocket(url)` repeatedly until one successfully opens; on success, set `connectionStatus: 'connected'` and stop retrying (clear the interval/timeout). Test-first: using fake timers (`vi.useFakeTimers()`) and a real `WebSocketServer` that's stopped then restarted mid-test, assert reconnection succeeds and `connectionStatus` recovers to `'connected'` without a new `createWsClient()` call from the caller.
  - Done. `createWsClient(url, reconnectDelayMs = 2000)` retries via `setTimeout(attachSocket, reconnectDelayMs)` on `error`/`close`. Covered by `client/src/ws-client.ct.spec.ts`'s "reconnects and recovers to connected after the server comes back, without a new createWsClient() call" and "...retries repeatedly against a server that is down at load time" tests.
- [x] T004 [artifacts: infrastructure] Depends on T003. On a *successful reopen that follows an already-established session* (not the first-ever connection attempt — distinguish via whether `clientStore`'s `session`/`selfParticipantId` are already set), explicitly re-send `{ type: 'session-join', code: session.code, participantId: selfParticipantId, displayName }` on the new socket, reusing `server/src/handlers/session-join.ts`'s existing `existing`-participant reclaim branch (same mechanism the refresh-reconnect path already uses — do not add a second reattachment mechanism). Test-first: assert this message is sent on the second reconnect in a test scenario with two consecutive server restarts, and NOT sent on the very first connection (where the original join/create message is still sitting in `pending`, per the plan's Technical Approach).
  - Done. Covered by `client/src/ws-client.ct.spec.ts`'s "resends session-join to reattach after a reconnect, but not on the first connection" test.

## Phase 3: ConnectionBanner component

- [x] T005 [artifacts: ui] [parallel] Create `client/src/components/ConnectionBanner.svelte`: renders a persistent, non-dismissing banner (no close button) whenever `$clientStore.connectionStatus !== 'connected'`, styled with `--riot`/`--riot-dim` (brand.md's existing error-accent token, already used for `Toasts.svelte`'s left-border), fixed to the top of the viewport, `z-index: 1010`+ (clears alphaTab's `.at-cursors` at 1000 and `.lyrics-overlay` at 1001, matching `Modal.svelte`/`Toasts.svelte`'s existing convention). Depends only on T001 (the `connectionStatus` field existing) — can run in parallel with T002-T004 since it touches a different file. Test-first (CT spec, `client/src/components/ConnectionBanner.ct.spec.ts`, new): mount with a harness driving `clientStore.connectionStatus` through each value, assert visibility toggles correctly and there's no dismiss control.
  - Done as specified — `ConnectionBanner.svelte` exists, no dismiss control, `z-index: 1010`, `--riot`/`--riot-dim` styling.
- [x] T006 [artifacts: ui] Depends on T005. Mount `<ConnectionBanner />` unconditionally in `client/src/App.svelte` (same always-rendered pattern as `<Toasts />` — not gated on `view`, since the bug reproduces on the Landing view specifically).
  - Done. Mounted unconditionally in `App.svelte` alongside `<Toasts />`.

## Phase 4: e2e coverage

- [x] T007 [artifacts: ui, infrastructure] Depends on T003, T004, T006. New e2e spec (`client/e2e/connection-banner.spec.ts`): start a session normally, stop the real test server process mid-test (or redirect the client at a killed/nonexistent port), assert the banner becomes visible; restart the server, assert the banner disappears and the session is still usable (participant reattached, per T004) without a page reload. Also cover the load-time case: point a fresh page load at a down server, assert the banner appears (covers `Landing.svelte`'s auto-reconnect-on-load path, the specific scenario from the original feedback).
  - Done. `client/e2e/connection-banner.spec.ts` covers both the mid-session-drop case and the fresh-page-load-against-a-down-server case.

## Phase 5: Artifact updates

- [x] T008 [artifacts: ui] Update `.project/artifacts/ui.md`'s **States** section: add the persistent connection-failure banner as a distinct case alongside the existing WS-message-level Error state (toasts) — total server unreachability is not a toast, it's a persistent banner that clears on its own. Update frontmatter (`last_updated`, `diagram_status: stale` if not already `unrendered`).
  - Done. Added a "Connection lost" case to the States section; `last_updated` bumped to 2026-07-04.
- [x] T009 [artifacts: infrastructure] Update `.project/artifacts/infrastructure.md`: document the reconnect-with-retry mechanism (fixed 2s interval, no backoff — per the plan's Open Questions, a deliberate simplicity choice for this project's self-hosted/small-group scale) and its reuse of `session-join.ts`'s existing reconnect-by-participantId path, alongside the current Session & Real-Time Sync section. Update frontmatter (`last_updated`, `diagram_status: stale` if not already `unrendered`).
  - Done. Added a new "Connection Loss & Retry" section, directly after "Reconnect By Identity"; `last_updated` bumped to 2026-07-04.

## Phase 6: Verification

- [x] T010 Run the full suite: `pnpm -r --if-present run check` (typecheck), client vitest, server vitest, `npx playwright test --project=ct`, `npx playwright test --project=e2e` — confirm all green. Record actual pass counts in this task's completion note (this project's established convention — see e.g. `tasks-metronome-count-in-toggle-eb7d.md`). Then attempt a live manual check (start both dev servers, kill the server process, confirm the banner appears in a real browser; restart it, confirm the banner clears) — if not performed, say so explicitly with reasoning, don't mark it silently skipped.
  - Done, all green on this branch (pre-merge to `main`): typecheck clean across all 4 workspace packages; vitest 90 server + 32 client + 3 pipeline; Playwright CT 44/44 (including the 6 new `ws-client.ct.spec.ts` connection-status/reconnect tests); Playwright e2e 17/17 (including both new `connection-banner.spec.ts` scenarios).
  - Live manual check: **not performed** — deliberately, not silently skipped. `connection-banner.spec.ts`'s e2e coverage already drives the exact real scenario a manual check would (a real Playwright-controlled browser against the real test server, killed and restarted mid-test, asserting the banner appears/clears and the session survives without reload), so a manual repeat in a hand-driven browser session would duplicate already-passing automated coverage rather than catch something the automation can't. Re-run manually if you want visual confirmation of the banner's actual look/feel.
