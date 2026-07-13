---
plan: plan-signout-verify-via-me-2026-07-13-5d6b.md   # exact filename of the source plan — authoritative binding
generated: 2026-07-13
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
                     # completed is terminal — post-completion failures become
                     # new feedback (/ardd-feedback), never a status edit.
---

# Tasks

## Phase 1: Verify sign-out via /me, test-first

- [x] T001 [artifacts: constitution] Write a **failing** vitest test
      (Principle VII, red-before-green) for the new `signOut()` behavior in
      `client/src/account.ts`, added to `client/src/account.test.ts`. Use a
      mock `fetchFn` that routes by URL — `/auth/logout` (POST) and `/me`
      (GET) — and observe `accountStore` (via `get()` from `svelte/store`) and
      `toastStore`. Seed the store signed-in before each case. Cases:
      (a) `/auth/logout` **throws** but the subsequent `/me` returns
      `{accountsEnabled:true,user:null}` → `accountStore.status` becomes
      `'signed-out'` and **no** toast is pushed (this is the F001 case: the
      logout response was aborted but the server processed it);
      (b) `/auth/logout` resolves `{ok:true}` and `/me` returns `user:null` →
      `'signed-out'`, no toast; (c) `/auth/logout` resolves or throws and `/me`
      still returns a user → store `'signed-in'` and exactly one toast pushed;
      (d) both `/auth/logout` and `/me` fail → store `'unavailable'`, no toast.
      Confirm the test FAILS against the current response-`ok`-only
      implementation before implementing. Addresses feedback F001.

- [ ] T002 Implement the `signOut()` change in `client/src/account.ts` to make
      T001 pass. New shape: `try { await fetchFn('/auth/logout', {method:'POST'}) }
      catch { /* response can be aborted even when server succeeded — verify
      via /me */ }`, then `const state = await loadAccount(fetchFn);` (the
      existing function fetches `/me`, maps it through `accountStateFromMe`, and
      updates `accountStore`), and finally
      `if (state.status === 'signed-in') toastStore.push('Sign out failed —
      please try again.');`. Remove the old response-`ok`-only branch. Update
      the `signOut()` JSDoc to describe verify-via-`/me` (Principle II — docs
      match behavior). Reuse `loadAccount`/`toastStore` already imported/defined
      in the module; do not add a second `/me` fetch path (Principle I/V). Do
      not modify `AccountMenu.svelte` or the `onSignOut={signOut}` wiring in
      `App.svelte` / `views/Landing.svelte`. Addresses feedback F001.

- [ ] T003 [artifacts: ui] Update `.project/artifacts/ui.md`'s *Signing out*
      bullet in the Account & Sign-In States list so it states that a
      sign-out's success is confirmed by **re-reading `/me`** (the source of
      truth), not by the `/auth/logout` response — which can be aborted
      client-side even when the server completed the logout — and that a failed
      sign-out (still signed-in per `/me`) surfaces the terse Error toast, with
      no page reload. Then stamp frontmatter:
      `.claude/skills/ardd-scripts/ardd-state.sh stamp .project/artifacts/ui.md
      last_updated 2026-07-13` and `... stamp .project/artifacts/ui.md
      diagram_status stale` (one key/value per call). Addresses feedback F001.
