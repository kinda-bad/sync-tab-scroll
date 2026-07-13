---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: signout-verify-via-me   # the branch inline implementation would use; may never be created (solo, on default)
created: 2026-07-13
features: []
surfaced-defects: []
---

# Plan: Sign out by verifying `/me`, not by trusting the logout response

## Goal

Make sign-out succeed whenever the server actually processes it — by having
`signOut()` confirm the real state via `GET /me` instead of trusting the
`/auth/logout` response, which is aborted client-side on prod even though the
server completed the logout (feedback F001).

## Scope

**In scope (F001 only)**
- `client/src/account.ts` `signOut()`: after `POST /auth/logout` (whether it
  resolves or throws), re-read `/me` via the existing `loadAccount(fetchFn)`
  (which fetches `/me`, updates `accountStore`, and returns the resolved
  state). Show the error toast **only if** `/me` still reports a signed-in
  user; otherwise the store has already been updated to signed-out (or
  unavailable) and we're done.
- A test (Principle VII, test-first) covering the new outcomes with a mock
  `fetchFn` that distinguishes the two endpoints.
- `ui.md` (Account & Sign-In → *Signing out* States bullet): small wording
  update — success is determined by re-reading `/me`, not by the logout
  response.

**Out of scope**
- **F002** (the 2s WebSocket stale-session rejoin storm that resets Railway's
  coalesced HTTP/2 connection and is the underlying aborter) — stays open in
  `feedback-signout-response-not-trusted-9575.md` for a follow-up plan. F001's
  fix makes sign-out robust regardless of F002, so they're separable; F002 is
  the deeper cause and worth its own fix later.
- The server logout handler — verified correct (revokes `AuthSession`, clears
  the cookie, returns `200`). No server change.
- `AccountMenu.svelte` and the `onSignOut={signOut}` wiring in `App.svelte` /
  `views/Landing.svelte` — unchanged.

## Technical Approach

Root cause (confirmed via live signed-in browser reproduction, 2026-07-13):
the logout **request** reliably reaches the server — the `AuthSession` is
revoked and the `sts_session` cookie cleared (`GET /me` returns `user: null`
immediately after, and a reload shows signed-out) — but the client's
`fetch('/auth/logout')` **throws before it can read the `200`**, because the
in-flight HTTP response is aborted when the coalesced HTTP/2 connection resets
(driven by the F002 WS reconnect storm). The prior fix removed the racing
`window.location.reload()`; there is no remaining reload in `client/src`, so
that was not the aborter. The response is simply untrustworthy on this
deployment.

The fix follows the source-of-truth principle already used at boot: `/me` is
authoritative for account state (`loadAccount` maps it via `accountStateFromMe`
into the single `accountStore`, constitution Principle I). So `signOut()` stops
inferring success from the logout response and instead **re-derives state from
`/me`**:

```ts
export async function signOut(fetchFn: typeof fetch = fetch): Promise<void> {
  try {
    await fetchFn('/auth/logout', { method: 'POST' });
  } catch {
    // The logout response can be aborted client-side even when the server
    // processed the request (feedback F001). Don't trust it — verify via /me.
  }
  const state = await loadAccount(fetchFn); // fetches /me, updates accountStore
  if (state.status === 'signed-in') {
    toastStore.push('Sign out failed — please try again.');
  }
}
```

- Server processed logout → `/me` is anonymous → `loadAccount` sets the store
  to `signed-out` (or `unavailable`) → no toast. **This is the case that was
  falsely failing.**
- Logout genuinely didn't take → `/me` still returns the user → store set to
  `signed-in` → error toast. Honest failure, retryable.
- `/me` itself also fails → `loadAccount` resolves to `unavailable` (its
  existing safe default) → affordances absent (presents signed-out), no false
  error toast.

This reuses `loadAccount` rather than adding a second `/me` path (Principle I,
and Principle V — prefer the existing idiom). It supersedes the prior fix's
response-`ok`-only check.

## Phase Breakdown

Single phase — one code change, its test, and the artifact wording. No internal
dependencies beyond test-before-implementation ordering (Principle VII).

### Phase 1: Verify sign-out via `/me`, test-first

- **T001** — Write a **failing** test for the new `signOut()` behavior with a
  mock `fetchFn` that routes by URL: `/auth/logout` and `/me`. Cases:
  (a) logout **throws** but `/me` then returns `{user:null}` → `accountStore`
  becomes `signed-out` and **no** toast (the F001 case — logout aborted but
  server succeeded); (b) logout resolves `ok:true` and `/me` returns
  `{user:null}` → `signed-out`, no toast; (c) logout resolves/throws and `/me`
  still returns a user → store `signed-in` and exactly one toast pushed;
  (d) both logout and `/me` fail → store `unavailable`, no toast. Confirm the
  test fails against the current response-`ok`-only implementation. Addresses
  feedback F001. [artifacts: constitution]
- **T002** — Implement the `signOut()` change in `client/src/account.ts` to
  make T001 pass: after `POST /auth/logout` (resolve or throw), call
  `loadAccount(fetchFn)` and push the terse error toast only when the returned
  state is `signed-in`. Update the JSDoc to describe the verify-via-`/me`
  behavior (Principle II). Do not touch `AccountMenu.svelte` or the sign-out
  wiring. Addresses feedback F001.
- **T003** — Update `ui.md`'s *Signing out* States bullet (Account & Sign-In)
  so it says a sign-out's success is confirmed by re-reading `/me` (source of
  truth), not by the logout response, and a failed sign-out (still signed-in
  per `/me`) surfaces the terse Error toast. Stamp frontmatter
  (`last_updated 2026-07-13`, `diagram_status stale`). Addresses feedback F001.
  [artifacts: ui]

## Open Questions

- **Does the `/me` verification meaningfully mask F002?** F001's fix makes
  sign-out *appear* to work even while the WS storm keeps resetting the h2
  connection, so the user-visible bug closes without F002 being fixed. That's
  intended (they're separable), but F002 should still be planned next — the
  reconnect storm also burns reconnects and can abort other requests. Not a
  blocker for this plan.
