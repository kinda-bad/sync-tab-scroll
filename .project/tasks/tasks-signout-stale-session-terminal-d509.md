---
plan: plan-signout-stale-session-terminal-2026-07-14-2e22.md
generated: 2026-07-14
status: in-progress
---

# Tasks

## Phase 1: Typed `session-not-found` message (shared + server)

- [x] T001 [artifacts: datamodel] Add a typed `{ type: 'session-not-found'; code: string }`
  variant to the `ServerMessage` union in `packages/shared/src/messages.ts`
  (currently `ServerMessage` ends at `{ type: 'error'; message: string }`).
  Test-first (Principle VII): add a compile-time assertion in the shared
  type-test style (see `packages/shared/src/account-types.type-test.ts`) that
  `{ type: 'session-not-found'; code: string }` is assignable to `ServerMessage`
  and that `code` is required — failing to typecheck before the union is
  extended. Addresses F001.

- [x] T002 In `server/src/handlers/session-join.ts`, change the no-live-session
  branch (line ~11) to `ctx.connections.send(socket, { type: 'session-not-found', code: message.code })`
  instead of `{ type: 'error', message: \`Session ${message.code} not found\` }`.
  Test-first: a server handler test (mirror the existing `server/src/handlers/*`
  test conventions and the `HandlerContext`/`connections.send` seam) asserting a
  `session-join` for a code with no live session sends exactly one
  `session-not-found` message carrying that `code`, and no `error` — RED before
  the handler edit. Depends on T001. Addresses F001.

## Phase 2: Client treats it as terminal (removes the heuristic)

- [ ] T003 In `client/src/ws-client.ts`, handle the new message: add a
  `message.type === 'session-not-found'` branch in the `message` listener that is
  **unconditionally terminal** — `toastStore.push(...)`, `suppressReconnect = true`,
  `socket.close()`, `clearStoredSession()`, and reset the store to the Landing
  shape (reuse the existing host-removal terminal-socket shape at
  `ws-client.ts:97-116`, do not add a second teardown path — Principle II).
  Then **remove** the `if (get(clientStore).session === null) { clearStoredSession(); suppressReconnect = true; socket.close(); }`
  block from the `error` handler (`ws-client.ts:147-151`) so generic `error`
  stays toast-only. Test-first CT (Playwright CT, per the browser-test strategy;
  extend the existing `ws-client` CT spec): seed the store with a restored
  session whose `code` the mock server answers with `session-not-found` on
  `session-join`; assert that after the reconnect-rejoin the socket goes terminal
  — no further `session-join` is sent (reconnect suppressed), the persisted
  session is cleared, and the toast is surfaced. The test must FAIL against
  current `main` (the storm continues) before the change. Depends on T001, T002.
  Addresses F001.

- [ ] T004 Regression CT covering the two paths the removed `session === null`
  heuristic previously straddled, both still correct under the new
  `session-not-found` handling: (a) first-open bad join code (`session` null) —
  server replies `session-not-found`, client shows the toast and stays on / returns
  to Landing without storming; (b) genuine transient drop of a **live** session —
  the socket reconnects and re-sends `session-join` (unchanged `ws-client.ts:50-61`),
  i.e. the fix must NOT make live-session reconnects terminal. No product change
  expected beyond T003. Depends on T003.

## Phase 3: Live prod re-verify

- [ ] T005 After merge and Railway deploy, re-run the production repro on
  https://sts.ty-pe.com as a signed-in user holding a stale stored session
  (reconnect banner + "Session … not found" toast): confirm the banner now
  clears (socket goes terminal, no 2s storm), then click SIGN OUT and confirm it
  completes end-to-end — menu returns to SIGN IN and, after a reload, `/me`
  returns `user:null`. Empirical close-out; not a code change. Depends on T004.
