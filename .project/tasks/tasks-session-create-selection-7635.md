---
plan: plan-session-create-selection-2026-07-03.md
generated: 2026-07-03
status: completed
---

# Tasks

## Phase 1: Chooser + split forms

- [x] T001 [artifacts: ui] Write a test first (Principle VII): update `client/e2e/single-participant.spec.ts` — both its tests currently do `page.getByPlaceholder('Musician').fill('Host')` then `page.getByRole('button', { name: 'Create session' }).click()` immediately after `page.goto(...)`. Add a preceding step clicking a new "Create a session" choice button (e.g. `page.getByRole('button', { name: 'Create a session' }).click()`) before the name field is fillable. Confirm this now fails against the current single-card `Landing.svelte` (no such choice button exists yet, so the name field is already present/fillable without it — the test's new expectation of a prior chooser step won't hold).

  Confirmed red: both tests time out waiting on `getByRole('button', { name: 'Create a session' })` since no such button exists in the current single-card `Landing.svelte`.

- [x] T002 [artifacts: ui] Restructure `client/src/views/Landing.svelte`: replace the single combined card (one shared "Your name" `TextInput` above both a "Create session" `Button` and a separate join-code-input-plus-"Join" section) with a local `let mode: 'choice' | 'create' | 'join' = 'choice'`. The `'choice'` state renders two buttons — "Create a session" (`onclick={() => mode = 'create'}`) and "Join a session" (`onclick={() => mode = 'join'}`). The `'create'` state renders its own `TextInput` (label "Your name", placeholder "Musician") wrapped in a native `<form onsubmit={(e) => { e.preventDefault(); createSession(); }}>` with a submit `Button` (no `onclick` needed — a `<button>` inside a `<form>` submits by default; check `Button.svelte`'s current props — it always renders `<button>` with an `onclick` prop but no `type` — confirm plain click-triggered submission still works inside a `<form>`, or add a `type="submit"` pass-through to `Button.svelte` if needed). The `'join'` state renders its own "Your name" `TextInput` plus the existing "Session code" `TextInput` (`uppercase`, keep existing placeholder for now — T005 fixes it), wrapped in its own `<form onsubmit={(e) => { e.preventDefault(); joinSession(); }}>` with its own submit button. Both `'create'` and `'join'` states get a small "Back" control (`onclick={() => mode = 'choice'}`) returning to the chooser. `createSession()`/`joinSession()` keep their existing guard logic (`if (!displayName) return;` / `if (!displayName || !joinCode) return;`) and existing `connect(...)` calls unchanged. `onMount`'s silent-rejoin check is unaffected — untouched. Run T001's test and confirm it passes.

  Added a `type: 'button' | 'submit' = 'button'` prop pass-through to `Button.svelte` (defaulted to `'button'` so all other existing call sites, which render outside any form, are unaffected) since its `<button>` had no explicit `type` and would otherwise rely on the implicit default only when nested in a form — explicit is safer given `Button` is used both inside and outside forms now. T001's test passes against the new chooser/create/join flow.

- [x] T003 Run the rest of the currently-passing e2e suite (`client/e2e/song-part-modal.spec.ts`, `client/e2e/multi-participant.spec.ts`, `client/e2e/host-controls.spec.ts`) to confirm which now fail due to the new chooser step (expected: all of them, since they all fill the name field immediately after `page.goto` without a prior chooser click) — this is expected breakage, fixed properly in Phase 3, not a regression to chase down here. Just confirm the failure mode is "chooser step missing" and not something else unexpected (e.g. a selector actually broken rather than just missing a preceding step).

  Confirmed: all 7 tests across the 3 files fail identically — `locator.fill`/`locator.click` timeout waiting on `getByPlaceholder('Musician')` (or the downstream "Create session" button), because the name field no longer exists until the new "Create a session" chooser button is clicked first. No other selector breakage observed. Fixed properly in Phase 3 (T006-T010).

- [x] T004 [artifacts: ui] Revise `.project/artifacts/ui.md`'s Landing View section to describe the new chooser → form flow (initial "Create a session" / "Join a session" choice, each leading to its own form with its own name input and native-form Enter-to-submit) in place of the current "Create a new session or join an existing one by code" single-card description. Bump `last_updated`.

  Docs-only task, no test required (constitution VII's documentation-change exception). `last_updated` was already `2026-07-03` (today); left as-is since it's already current.

## Phase 2: Join-code placeholder fix

- [x] T005 [artifacts: ui] In `Landing.svelte`'s join form (from T002), fix the "Session code" `TextInput`'s placeholder from `"ABC123"` to a 4-character example (e.g. `"AB12"`), matching `server/src/session-store.ts`'s `generateJoinCode()` (session-store.ts:9, generates exactly 4 characters).

  No test task declared for this in the plan/task file — a one-line placeholder-string change with no behavioral branch to assert on, so no new test added (nothing in the e2e suite asserts on this placeholder's exact text). Also updated `TextInput.stories.svelte`'s `JoinCode` story placeholder from `"ABC123"` to `"AB12"` for consistency, since it was the only other place the stale 6-char example lived.

## Phase 3: Shared e2e helpers + fallout fixes

- [x] T006 Add two shared helpers to `client/e2e/helpers.ts`: `createSessionAsHost(page: Page, name: string): Promise<void>` (does `page.goto('http://localhost:4173/')`, clicks "Create a session", fills the name field, submits) and `joinSessionAsMember(browser: Browser, name: string, code: string): Promise<{ context: BrowserContext; page: Page }>` (opens a new browser context/page, navigates, clicks "Join a session", fills name + code, submits, returns `{ context, page }` — mirroring the exact shape of `multi-participant.spec.ts`'s and `host-controls.spec.ts`'s current inline `joinAsMember` functions and `song-part-modal.spec.ts`'s equivalent setup, read all three first to match their exact call-site expectations before writing the shared version). Import `Browser`/`BrowserContext`/`Page` types from `@playwright/test`.

  Read all three spec files' inline setups first — `multi-participant.spec.ts` and `host-controls.spec.ts`'s `joinAsMember(browser, code)` are structurally identical (new context/page, goto, fill Musician, fill Session code by label, click Join, return `{ context, page }`), so the shared `joinSessionAsMember` matches both exactly, just parameterizing the name too instead of hardcoding `'Member'`. No dedicated test added for T006 itself — T007/T008/T009/T010 are the tests that exercise these helpers end-to-end (verified together in T011), consistent with the task file's own phase structure.

- [x] T007 Update `client/e2e/single-participant.spec.ts` to call `createSessionAsHost(page, 'Host')` instead of its own inline goto+click+fill+click sequence (this also subsumes T001's chooser-step fix into the shared helper — the test itself gets simpler, not more complex).

  Both tests now call `createSessionAsHost(page, 'Host')` in place of the 3-line inline sequence.

- [x] T008 [parallel] Update `client/e2e/song-part-modal.spec.ts` to call `createSessionAsHost(page, 'Host')` instead of its inline sequence.

  All 3 tests updated identically.

- [x] T009 [parallel] Update `client/e2e/multi-participant.spec.ts` to call `createSessionAsHost(page, 'Host')` and replace its own inline `joinAsMember` function with the shared `joinSessionAsMember(browser, 'Member', code)`, removing the now-redundant local function.

  Removed the local `joinAsMember` function and its now-unused `Browser` type import; both tests updated.

- [x] T010 [parallel] Update `client/e2e/host-controls.spec.ts` to call `createSessionAsHost(page, 'Host')` and replace its own inline `joinAsMember` function with the shared `joinSessionAsMember(browser, 'Member', code)`, removing the now-redundant local function.

  Same treatment as T009.

- [x] T011 Run the full e2e suite (`pnpm --filter client test:e2e`) and confirm every spec file passes with the shared helpers, no regressions from the chooser step anywhere.

  All 9 e2e tests pass (4 files: single-participant ×2, song-part-modal ×3, multi-participant ×2, host-controls ×2).

## Phase 4: Full suite verification

- [x] T012 Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and `pnpm --filter client test:e2e` together. Confirm every test from Phases 1-3 passes alongside the existing suite, with no regressions. Report final test/file counts.

  All green, no regressions: vitest 6 files/25 tests; CT 6 files/16 tests; e2e 4 files/9 tests (single-participant ×2, song-part-modal ×3, multi-participant ×2, host-controls ×2) — same file/test counts as before this plan (this plan changed *how* the e2e setup happens, not how many tests exist). Total client: 16 files / 50 tests.
