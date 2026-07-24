---
plan: plan-input-validation-e2e-hardening-2026-07-23-61c0.md
generated: 2026-07-23
status: in-progress
---

# Tasks

## Phase 1: Server Reject Behavior

- [x] T001 [artifacts: infrastructure] In `server/src/input-validation.test.ts`, write failing tests asserting `validateDisplayName`/`validateActivationKey` return a discriminated result type (add it to `server/src/input-validation.ts` as e.g. `type ValidationResult = { ok: true; value: string } | { ok: false }`) — `ok: false` for input containing a control character, an HTML special character (`<>&"'`), or exceeding the existing max length (64 for displayName, 256 for activation key); `ok: true` with the unchanged value for valid Unicode/emoji input. Confirm the tests fail against the current sanitize-only implementation.
- [x] T002 [artifacts: infrastructure] Implement the new `ValidationResult`-returning `validateDisplayName`/`validateActivationKey` in `server/src/input-validation.ts`, replacing `sanitize()`'s strip-and-truncate behavior with a reject check. Make T001 pass.
- [x] T003 [artifacts: infrastructure] Update the three call sites — `server/src/handlers/session-create.ts`, `server/src/handlers/session-join.ts`, `server/src/handlers/catalogue-unlock.ts` — to handle the new `ValidationResult`: on `ok: false`, send `{ type: 'error', message: '<field> is invalid' }` and return without proceeding; on `ok: true`, use `.value` as before. Write failing tests first in each handler's existing `.test.ts` file asserting invalid input now produces an `error` message and no session/state change, confirm they fail, then make them pass.

## Phase 2: Client Validation — displayName + Activation Key

- [x] T004 [artifacts: ui] [parallel] Write a failing Playwright CT spec (new `client/src/input-validation.ct.spec.ts`) asserting the Landing View's "Your name" input and the Lobby's activation-key input show inline validation feedback (e.g. a field-level error message) when the entered value contains control/HTML characters or exceeds the server's max length, mirroring `input-validation.ts`'s rules (64/256-char caps). Confirm it fails (no such client-side check exists yet).
- [x] T005 [artifacts: ui] Add the non-authoritative client-side checks to `client/src/views/Landing.svelte`'s name input and the activation-key input component, surfacing the inline feedback T004 tests for. Make T004 pass. This is UX only — does not replace or weaken the server-side reject from Phase 1.

## Phase 3: Join-Code Field Audit

- [ ] T006 [artifacts: ui, infrastructure] Determine what format constraint is appropriate for the join-code field (`client/src/views/Landing.svelte`'s "Session code" input, bound to `joinCode`) — check the actual code-generation format server-side (session code generator) to ground the constraint in real generated values, not a guess. Write a failing test (client CT for the client-side check, server test for the server-side check) asserting the chosen constraint is enforced at both layers, confirm it fails, then implement it at both layers to pass.

## Phase 4: Phase 2 Authoring — Catalogue-Creation Field Validation

- [x] T007 [artifacts: infrastructure] Generalize `input-validation.ts`'s reject logic into a reusable exported helper (e.g. `validateField(input: string, maxLength: number): ValidationResult`) that `validateDisplayName`/`validateActivationKey` (Phase 1) and this task's new call sites both use — avoids re-implementing the same control/HTML-char/length check per field (constitution Principle VI). Write a failing test in `server/src/input-validation.test.ts` for the generalized helper first, confirm it fails, then implement and confirm `validateDisplayName`/`validateActivationKey` still pass using it (refactor, not a behavior change for Phase 1's already-passing tests).
- [ ] T008 [artifacts: infrastructure] In `server/src/catalogue-authoring-routes.ts`'s create-catalogue handler (`createCatalogueAuthoringRequestHandler`), apply `validateField` to `slug`, `name`, and `key` before proceeding — reject with the route's existing `json(res, 400, { error: ... })` shape on invalid input, alongside the existing type/presence checks already there. Write a failing test first (there's an existing test file for this route — extend it) asserting invalid `slug`/`name`/`key` now gets a 400 with a clear message; confirm it fails, then implement to pass.
- [ ] T009 [artifacts: ui] [parallel] Write a failing Playwright CT spec extending or adding alongside existing `AuthoringModal.svelte` coverage, asserting the create-catalogue form (`slug`, `name`, `key` inputs) shows inline validation feedback for invalid input, mirroring T004's pattern. Confirm it fails, then add the matching non-authoritative client-side checks to `AuthoringModal.svelte` to pass.

## Phase 5: Phase 2 Authoring — Add-Song Field Validation

- [ ] T010 [artifacts: infrastructure] In `server/src/song-upload-route.ts`, apply `validateField` (from T007) to the `artist`, `title`, and `submitterName` query params before they're used — notably before `buildStagedFilename(artist, title)` builds a filesystem path from them, which is currently unvalidated attacker-controlled input feeding a path construction. Reject with the route's existing `json(res, 400, { error: ... })` shape on invalid input. Write a failing test first (extend the existing test file for this route) asserting invalid `artist`/`title`/`submitterName` now gets a 400; confirm it fails, then implement to pass.
- [ ] T011 [artifacts: ui] [parallel] Write a failing Playwright CT spec extending or adding alongside existing `AuthoringModal.svelte` coverage, asserting the add-song form (`artist`, `title`, `submitterName` inputs) shows inline validation feedback for invalid input, mirroring T004's pattern. Confirm it fails, then add the matching non-authoritative client-side checks to `AuthoringModal.svelte` to pass.

## Phase 6: e2e Fixture-Drift Sweep

- [x] T012 [parallel] Fix `client/e2e/host-transfer.spec.ts`'s `.first()`-based song selection (line 6): replace with a `.filter({ hasText: '<song name>' })` selection of whichever fixture song the spec's assertions actually depend on, following the pattern `host-controls.spec.ts` (T023/T024, prior session) already established. No new test framework needed — this is a fix to an existing e2e spec; verify it passes against the current fixture catalog after the change.
- [x] T013 [parallel] Fix `client/e2e/multi-participant.spec.ts`'s `.first()`-based song selection (lines 25, 45) the same way as T012.
- [x] T014 [parallel] Fix `client/e2e/single-participant.spec.ts`'s `.first()`-based song selection (lines 24, 41, 61) the same way as T012.
- [x] T015 [parallel] Fix `client/e2e/small-screen.spec.ts`'s `.first()`-based song selection (lines 43, 55, 107, 129) the same way as T012.
- [x] T016 [parallel] Fix `client/e2e/song-part-modal.spec.ts`'s `.first()`-based song selection (lines 58, 94, 111 — leave the *part*-selection `.first()` calls at lines 59, 69, 70, 105, 112 untouched, per the plan's Out of Scope) the same way as T012.
- [x] T017 [parallel] Fix `client/e2e/lyrics-only-view.spec.ts`'s `.first()`-based song selection (line 20) the same way as T012.
