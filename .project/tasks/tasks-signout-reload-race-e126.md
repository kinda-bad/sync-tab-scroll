---
plan: plan-signout-reload-race-2026-07-13-2e98.md   # exact filename of the source plan — authoritative binding
generated: 2026-07-13
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
                     # completed is terminal — post-completion failures become
                     # new feedback (/ardd-feedback), never a status edit.
---

# Tasks

## Phase 1: Fix sign-out, test-first, and document the failure state

- [ ] T001 [artifacts: constitution] Write a **failing** test (Principle VII,
      red-before-green) for `signOut()` in `client/src/account.ts`. Place it in
      the existing client test suite (e.g. `client/src/account.test.ts`; create
      it if absent, matching the vitest style of sibling `*.test.ts` files like
      `toast-store.test.ts`). Call `signOut(mockFetch)` with an injected
      `fetchFn` and assert three outcomes by observing `accountStore` (via
      `get(accountStore)` from `svelte/store`) and `toastStore`: (a) mockFetch
      resolves `{ ok: true }` → `accountStore.status` becomes `'signed-out'`
      with `displayName: null`, and `window.location.reload` is NOT called
      (spy/stub it and assert zero calls); (b) mockFetch resolves `{ ok: false }`
      → `accountStore` is left at its prior signed-in value and exactly one
      toast is pushed; (c) mockFetch rejects (network throw) → `accountStore`
      unchanged (signed-in) and exactly one toast pushed. Seed the store to a
      signed-in state before each case. Confirm the test FAILS against the
      current unconditional-reload implementation before proceeding. Addresses
      feedback F001 (bug: sign-out silently fails on prod via reload race).

- [ ] T002 Implement the `signOut()` fix in `client/src/account.ts` to make
      T001 pass. Await `fetchFn('/auth/logout', { method: 'POST' })`; on a
      confirmed `res.ok`, set `accountStore` to `{ status: 'signed-out',
      displayName: null }` and do NOT reload (remove the unconditional
      `window.location.reload()`). On a non-OK response OR a thrown fetch, leave
      `accountStore` untouched (menu stays signed-in) and push a single terse
      error toast via `toastStore.push(...)` (import from `./toast-store`),
      wording consistent with ui.md's terse Error-toast pattern (e.g. "Sign out
      failed — please try again."). Delete the failure-swallowing `catch {}`
      that reloaded anyway. Keep the JSDoc on `signOut()` accurate to the new
      no-reload behavior (Principle II — docs describe what's true). Do not
      change `AccountMenu.svelte` or the `onSignOut={signOut}` wiring in
      `App.svelte`/`views/Landing.svelte`. Addresses feedback F001.

- [ ] T003 [artifacts: ui] Update `.project/artifacts/ui.md` (Account & Sign-In
      section and/or its States list) to document the failure-surfacing
      decision: a **confirmed** sign-out flips the account menu to signed-out
      in-memory (no page reload); a **failed** sign-out keeps the user
      signed-in and surfaces a terse Error toast rather than reloading into a
      signed-out-looking state — same terse-toast Error pattern as other
      per-action failures. Then stamp frontmatter via
      `.claude/skills/ardd-scripts/ardd-state.sh stamp .project/artifacts/ui.md
      last_updated 2026-07-13 diagram_status stale`. Addresses feedback F001.
