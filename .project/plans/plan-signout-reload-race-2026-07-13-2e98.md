---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: signout-reload-race   # the branch inline implementation would use; may never be created (solo, on default)
created: 2026-07-13
features: []
surfaced-defects: []
---

# Plan: Fix sign-out reload race (masked failure on prod)

## Goal

Make **Sign out** actually sign the user out on production by replacing the
hard `window.location.reload()` in `signOut()` — which races/aborts the
`/auth/logout` request so its cookie-clearing `Set-Cookie` never lands — with
a confirmed-OK, in-memory account-store transition, and surface a real error
(not a false success) when logout fails.

## Scope

**In scope**
- `client/src/account.ts` `signOut()`: check `response.ok`; on confirmed OK,
  transition `accountStore` to `signed-out` in-memory (no reload); on failure
  (non-OK or network error), keep the signed-in view and surface an error
  toast via the existing `toastStore`.
- A test (Principle VII, test-first) covering the three `signOut()` outcomes:
  confirmed-OK → store becomes `signed-out`, no reload; non-OK → store
  unchanged (still `signed-in`) + toast pushed; network throw → store
  unchanged + toast pushed.
- `ui.md` (Account & Sign-In / States): document the failure-surfacing
  decision — a failed sign-out stays signed-in and shows a terse Error toast,
  rather than reloading into a signed-out-looking state.

**Out of scope**
- The server logout handler, which is verified correct (`POST /auth/logout`
  returns `200` and clears the cookie with matching attributes; revokes the
  `AuthSession`). No server change.
- The `signIn()` full-page-redirect flow — unchanged.
- Any redesign of `AccountMenu.svelte` — it is presentational and stays
  prop-driven; the parent still wires `onSignOut={signOut}` unchanged in both
  `App.svelte` (Bar) and `views/Landing.svelte`.
- Re-locking session-scoped catalogue unlocks on sign-out (see Open Questions;
  believed to be a non-issue — unlock is per-session server state a reload
  wouldn't re-lock either).

## Technical Approach

Root cause (confirmed via live prod reproduction + in-page isolation test,
feedback F001): the logout request itself works — run alone it returns `200`
and `/me` immediately reports anonymous. The differentiator is the trailing
`window.location.reload()`, which races the in-flight `fetch` so the response
(and its `Set-Cookie: sts_session=; Max-Age=0`) never commits; the fresh page
then re-derives *signed-in* from the surviving cookie. The pre-existing
`catch {}` compounds this by swallowing a failed logout and reloading anyway —
a failed logout presented as success.

Fix: stop reloading. `signOut()` awaits `/auth/logout`, and **only** on a
confirmed `res.ok` sets `accountStore` to `{ status: 'signed-out',
displayName: null }` in memory — the single reactive store (Principle I) is
already wired to both `AccountMenu` instances, so the UI flips to signed-out
with no navigation and no race. On a non-OK response or a thrown fetch, the
store is left untouched (the account menu stays signed-in) and a terse error
toast is pushed via the existing `toastStore` (`client/src/toast-store.ts`,
already the app's Error-surfacing channel per ui.md States). `accountStore`
already exposes `set`; `toastStore` already exposes `push` — no new
infrastructure.

The `ui.md` edit records the small States decision this introduces (how a
failed sign-out is shown), keeping the artifact in step with the behavior.

## Phase Breakdown

Single phase — one code fix, its test, and the artifact note. No internal
dependencies beyond test-before-implementation ordering (Principle VII).

### Phase 1: Fix sign-out, test-first, and document the failure state

- **T001** — Write a failing test for `signOut()` covering all three outcomes
  with a mock `fetchFn` and observation of `accountStore` / `toastStore`:
  (a) `res.ok` true → `accountStore` becomes `signed-out` and
  `window.location.reload` is **not** called; (b) `res.ok` false → store stays
  `signed-in`, one toast pushed; (c) fetch throws → store stays `signed-in`,
  one toast pushed. Addresses feedback F001. [artifacts: constitution]
- **T002** — Implement the `signOut()` fix in `client/src/account.ts` to make
  T001 pass: check `res.ok`, set `accountStore` to `signed-out` on confirmed
  OK with no reload, push a terse error toast and leave the store untouched on
  failure. Remove the unconditional `window.location.reload()` and the
  failure-swallowing `catch {}` semantics. Addresses feedback F001.
- **T003** — Update `ui.md` (Account & Sign-In / States) to document that a
  failed sign-out keeps the user signed-in and surfaces a terse Error toast
  rather than reloading into a signed-out-looking state; stamp frontmatter
  (`last_updated`, `diagram_status stale`). Addresses feedback F001.
  [artifacts: ui]

## Open Questions

- **In-session sign-out and pre-unlocked member catalogues.** When a signed-in
  host has member catalogues auto-unlocked in the *current* session and signs
  out from the Bar, the in-memory store transition (no reload) does not
  re-lock them for that session. Believed a non-issue: catalogue unlock is
  per-session server state that a reload would not re-lock either, and the
  reproduced bug is on Landing (no session). Confirm during implementation; if
  it does need re-locking, that is a separate follow-up, not a reason to keep
  the racing reload.
