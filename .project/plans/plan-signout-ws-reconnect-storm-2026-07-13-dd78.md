---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: signout-ws-reconnect-storm
created: 2026-07-13
features: []
surfaced-defects: []
---

# Plan: Stop the stale-session WS reconnect storm and harden sign-out against an unreachable `/me`

## Goal

Make sign-out actually complete on the Railway/HTTP2 deployment by killing
the underlying stale-session WebSocket reconnect loop (F002) that resets the
shared connection and aborts in-flight requests, and stop `signOut()` from
blanking the account menu when its post-logout `/me` verification is itself
unreachable (F003).

## Scope

**In scope** (both from `feedback-signout-response-not-trusted-9575.md`):

- **F002** — On the Landing page with a *stale stored session id*, the WS
  client rejoins a non-existent session, the server rejects it, and the client
  reconnects every `reconnectDelayMs = 2000` forever with no give-up. On
  Railway's HTTP/2 edge the coalesced WS + `fetch` share a connection, so each
  reconnect cycle can reset an in-flight HTTP request — this is the confirmed
  aborter behind the broken sign-out (and the original "Connection lost" flash).
  Fix: a rejoin rejected because the session no longer exists must **clear the
  stored session identity and stop retrying**, not hammer a dead session.
- **F003 (follow-up 2)** — Reconsider F001's `unavailable` fallback in
  `signOut()`. When the post-logout `/me` confirmation is *aborted/unreachable*,
  `loadAccount` currently resolves to `unavailable`, which **hides the account
  menu entirely** — a misleading blank/"signed-out-looking" state while the user
  is still signed in, with no SIGN OUT button to retry. Keep the menu
  *Signed-in* and show a retryable Error toast instead of blanking.

**Out of scope:**

- F001 itself (verify-sign-out-via-`/me`) — already implemented and deployed
  (`0f8a3db` / Railway `d5f8c8f3`); this plan builds on it, it doesn't redo it.
- F003 follow-up (1) "fix F002" — that *is* F002, not a separate item.
- Any WS reconnect backoff/give-up policy for the *normal* connection-lost case
  (a live session that drops). Principle-sanctioned fixed-interval retry stays;
  only the **stale/non-existent-session** rejoin is made terminal.

## Technical Approach

**F002 — terminal stale-session join failure (`client/src/ws-client.ts`).**
`connect()` on Landing sends `session-join` for the stored session; a missing
session comes back as a generic `{ type: 'error', message: 'Session … not
found' }` (`server/src/handlers/session-join.ts:11`), which today only pushes a
toast while the socket stays open and later reconnects, re-cycling the shared
connection. The client already owns a precedent for a *terminal* socket in the
host-removal path: it sets `suppressReconnect = true`, `socket.close()`, and
`clearStoredSession()` (`ws-client.ts:97-116`, mirrored in `ui.md` States "This
client's own reconnect loop is also stopped"). Apply the same shape to a
bootstrap join that fails because the session no longer exists: when an `error`
arrives while the client has **no established session yet** (`clientStore.session
=== null` — i.e. this was the initial create/join handshake, not a mid-session
error toast like part-not-found), treat it as a failed rejoin — `clearStoredSession()`,
set `suppressReconnect = true`, and close the socket so the 2s loop stops.

This keeps the discriminator client-side (no new shared message type), reusing
the existing `session === null` "we never joined" condition rather than adding a
server-side error code. (Alternative considered — a typed `session-not-found`
ServerMessage — is noted in Open Questions; the client-side heuristic is the
smaller change and is what the two other error toasts, part/song-not-found,
never trip because they only occur once a session exists.)

**F003 — distinguish "`/me` unreachable" from "accounts unavailable"
(`client/src/account.ts`).** Today `loadAccount()` maps *any* `/me` failure
(network error or non-200) to `unavailable`, which is correct for boot (a
server with no DB) but wrong for `signOut()`, where an aborted `/me` must not
masquerade as "no accounts" and blank the menu. Extract the raw fetch into a
`fetchMe(fetchFn): Promise<AccountState>` that **throws** on network error /
non-ok; `loadAccount` keeps its current swallow-to-`unavailable` boot behavior
by wrapping `fetchMe` in try/catch (single store write preserved, Principle I).
`signOut()` calls `fetchMe` directly: on success it sets the store and toasts
only if still `signed-in`; on throw (unreachable `/me`) it **leaves the store
untouched** (menu stays *Signed-in*) and shows the retryable Error toast. With
F002 fixed the unreachable case becomes rare, but this makes the failure mode
non-misleading regardless.

**Artifacts.** Both items are `[artifacts: ui]`. `ui.md` States gains a
stale-session note (mirroring the host-removal reconnect-stop wording), and the
*Signing out* state text is amended so an unreachable `/me` keeps the menu
*Signed-in* + retryable toast rather than falling through to *Accounts
unavailable* (which is reserved for a DB-less server).

## Phase Breakdown

Ordered: Phase 1 is the real remedy (removes the aborter); Phase 2 is
defence-in-depth on the sign-out path. They touch different source files
(`ws-client.ts` vs `account.ts`) but both edit `ui.md`, so the artifact edits
are kept in separate tasks to avoid a same-file collision.

**Phase 1 — Kill the stale-session reconnect storm (F002)**
1. *(TDD)* Failing test in `client/src/ws-client.ct.spec.ts` (or
   `ws-client.test.ts`): a client that opens, sends `session-join`, and receives
   an `error` message **while `clientStore.session` is null** must clear the
   stored session, stop reconnecting (no further socket open after
   `reconnectDelayMs`), and close. Addresses F002.
2. Implement in `ws-client.ts`: in the `message` handler's `error` branch, when
   `get(clientStore).session === null`, `clearStoredSession()`, set
   `suppressReconnect = true`, `socket.close()` — reusing the host-removal
   terminal-socket shape. Keep the existing toast. Addresses F002.
3. `[artifacts: ui]` Add a **Stale session** note to `ui.md` States: a stored
   session that no longer exists on the server clears the persisted identity and
   stops the client's reconnect loop (same reconnect-stop guarantee already
   documented for host removal), so it can no longer abort in-flight requests on
   an HTTP/2 edge. Addresses F002.

**Phase 2 — Don't blank the menu on an unreachable `/me` (F003)**
4. *(TDD)* Failing tests in `client/src/account.test.ts`: (a) `signOut` when
   `/me` throws/non-ok leaves `accountStore` at its prior `signed-in` value
   (not `unavailable`) and pushes the "Sign out failed — please try again."
   toast; (b) `loadAccount` still resolves to `unavailable` on a failed `/me`
   (boot behavior unchanged). Addresses F003.
5. Implement in `account.ts`: extract `fetchMe(fetchFn)` that throws on
   failure; `loadAccount` wraps it (swallow → `unavailable`); `signOut` uses
   `fetchMe` and, on throw, keeps the store untouched + retryable toast.
   Addresses F003.
6. `[artifacts: ui]` Amend the *Signing out* state in `ui.md`: an unreachable
   post-logout `/me` keeps the menu *Signed-in* and surfaces the retryable Error
   toast; *Accounts unavailable* is reserved for a DB-less server, not a
   transient `/me` failure. Addresses F003.

## Open Questions

- **Client heuristic vs typed server message.** This plan discriminates
  "stale-session join failure" client-side via `session === null`. A more
  explicit alternative is a dedicated `session-not-found` ServerMessage (shared
  type + `session-join.ts` change) that the client keys on directly. The
  heuristic is smaller and sufficient given the other `error` toasts only fire
  post-join; flag if a future error path can arrive pre-join for a reason that
  *shouldn't* be terminal.
- **Interaction with the Connection-lost banner.** Confirm during
  implementation that stopping the stale reconnect doesn't leave the
  `ConnectionBanner` stuck `disconnected` on Landing — after the terminal close
  the store should read a non-error resting state, not a permanent banner.
