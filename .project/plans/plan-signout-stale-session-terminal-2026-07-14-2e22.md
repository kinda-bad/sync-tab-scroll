---
status: approved
branch: signout-stale-session-terminal
created: 2026-07-14
features: []
surfaced-defects: []
---

# Plan: Make a stale-session rejoin terminal via an explicit server signal

## Goal

Fix production sign-out (feedback `F001`,
`feedback-signout-stale-session-reconnec-3e5b`): a persisted-but-dead session
must make the WebSocket terminal so its 2s reconnect storm stops aborting the
`/auth/logout` fetch — by replacing F002's `session === null` heuristic with an
explicit, typed `session-not-found` signal from the server.

## Scope

**In:**
- New typed `ServerMessage` variant `session-not-found` (`packages/shared`).
- `session-join` handler emits it instead of a generic `error` when the code
  has no live session (`server/src/handlers/session-join.ts`).
- Client (`client/src/ws-client.ts`) treats `session-not-found` as terminal
  (`clearStoredSession()` + `suppressReconnect` + `socket.close()` + toast) and
  the fragile `if (get(clientStore).session === null)` branch is removed.
- Test-first coverage (Principle VII): a client CT reproducing the
  restored-stale-session rejoin storm going terminal, and a server handler test
  for the new message.

**Out:**
- No artifact changes. The observable behavior (stale session ⇒ terminal +
  toast, back to Landing) already matches `ui.md`'s "Stale session" state — only
  the mechanism changes — so the feedback item carried no `[artifacts: …]` tag.
- No change to `/auth/logout`, `signOut()`, or F003's `fetchMe()` behavior —
  those are correct; the storm was the sole remaining aborter.
- No change to the 2s reconnect for *genuine* transient drops (a live session
  whose socket dropped must still reconnect-and-rejoin — `ws-client.ts:50-61`).

## Technical Approach

The root cause is that two code paths key off the same field with mutually
exclusive conditions: the reconnect-rejoin (`ws-client.ts:50-61`) fires only
when `state.session` is **non-null**, while F002's terminal-close
(`ws-client.ts:147`) fires only when `session === null`. A persisted stale
session (non-null) therefore rejoins forever and never terminates.

Rather than add another client-side heuristic (e.g. a "join in flight" marker),
make the **server** — the authority on whether a session exists — say so
explicitly. `session-join` already detects the miss (`session-join.ts:11`); it
should send a typed `session-not-found` instead of a stringly-typed `error`.
The client then has an unambiguous terminal signal that does not depend on any
inference about its own store state, eliminating the entire class of
wrong-guess bug F002 fell into (constitution Principle VI — a named type for a
concept currently smuggled through an `error` string).

The client keeps showing a toast (reusing the message text, or deriving one
from the code) so the UX is unchanged, and reuses the existing host-removal
terminal-socket shape for the teardown (Principle II — one terminal mechanism,
not a second).

## Phase Breakdown

### Phase 1 — Typed `session-not-found` message (shared + server)
- **T001** [artifacts: datamodel] — Add `{ type: 'session-not-found'; code: string }`
  to the `ServerMessage` union in `packages/shared/src/messages.ts`. Test-first:
  a type-level assertion (or reuse `account-types.type-test.ts` style) that the
  variant is part of `ServerMessage`. Addresses `F001`.
- **T002** — In `server/src/handlers/session-join.ts`, when the code resolves to
  no live session, send `{ type: 'session-not-found', code: message.code }`
  instead of `{ type: 'error', message: 'Session <code> not found' }`. Test-first:
  a server handler test asserting a join for an unknown code emits
  `session-not-found` with the code (RED before the handler change). Depends on
  T001. Addresses `F001`.

### Phase 2 — Client treats it as terminal (removes the heuristic)
- **T003** — In `client/src/ws-client.ts`, add a `message.type === 'session-not-found'`
  branch that is unconditionally terminal: `clearStoredSession()`,
  `suppressReconnect = true`, `socket.close()`, and a toast. Remove the
  `if (get(clientStore).session === null)` terminal branch from the `error`
  handler (`ws-client.ts:147`) — the generic `error` handler goes back to
  toast-only. Test-first CT: a restored stale session (store seeded with a
  session whose code the mock server rejects) must, on reconnect-rejoin, receive
  `session-not-found`, stop reconnecting (no further `session-join` after the
  terminal close), clear the persisted session, and surface the toast — the test
  must fail against the current build (storm continues) before the change.
  Depends on T001, T002. Addresses `F001`.
- **T004** — Regression check that the *first-open* bad-code path (user types a
  wrong join code, `session` still null) still shows the toast and returns to
  Landing under the new `session-not-found` handling, and that a genuine
  transient drop of a *live* session still reconnect-rejoins (unchanged
  `ws-client.ts:50-61`). Extend the CT suite; no product change expected — this
  guards the two paths the removed heuristic previously straddled. Depends on
  T003.

### Phase 3 — Live prod re-verify
- **T005** — After merge + Railway deploy, re-run the prod repro on
  https://sts.ty-pe.com as a signed-in user with a stale stored session: confirm
  the reconnect banner clears (goes terminal), and SIGN OUT now completes
  end-to-end (menu → SIGN IN, `/me` returns `user:null` after reload). Not a
  code task; the empirical close-out the earlier verify left open.

## Open Questions

- **Toast text.** Keep the current "Session <code> not found" wording (client
  builds it from `code`), or a friendlier "That session has ended" for the
  stale-reconnect case? Default: reuse the existing wording to minimize surface;
  revisit as UX polish if desired.
- **Other `error` senders.** `song-select` also emits `... not found` strings,
  but those are mid-session and stay generic `error` toasts — only `session-join`
  migrates to the typed message. Confirmed in scope review; no other handler
  changes.
