---
plan: plan-lyrics-only-view-fix-2026-07-04.md
generated: 2026-07-04
status: in-progress   # generating -> ready -> in-progress -> completed
---

# Tasks

## Phase 1: Fix + regression guard

- [x] T001 [artifacts: infrastructure] Add `alphaTabWorkerAssets()` to `client/vite.config.ts`'s `plugins` array, mirroring the existing plugin already defined in `client/playwright.config.ts`'s `ctViteConfig`. It must emit `alphaTab.worker.mjs`, `alphaTab.worklet.mjs`, and `alphaTab.core.mjs` into `dist/assets/` via `generateBundle`/`emitFile`, reading source bytes from `require.resolve('@coderline/alphatab')`'s directory. **Complete** — committed in `48e005d`.
- [x] T002 Verify `pnpm --filter client build` (with `VITE_BACKEND_PORT` set) emits `dist/assets/alphaTab.worker.mjs`. **Complete, verified** — confirmed present post-build.
- [x] T003 Verify end-to-end in a real (non-Playwright) Chrome session against the rebuilt `vite preview` server: create a session, select the synthetic-song fixture, select the Lyrics part, start playback, confirm `.full-lyrics-view` shows real line text (not blank) and readiness resolves promptly (not stuck on "LOADING"). Repeat against `pnpm dev` to confirm no dev regression. **Complete, verified** — both surfaces confirmed working through real playback in a real browser.
- [x] T004 [artifacts: infrastructure] [parallel] Add a deterministic build-time regression guard that fails on the actual defect class (missing worker asset), not just on rendering logic CT already covers. Simplest form: a `client` vitest test (or a small script wired into an existing test) that runs/assumes a build has happened and asserts `client/dist/assets/alphaTab.worker.mjs` exists — OR, if a build-in-test is too slow/heavy for the vitest suite, a `postbuild` check in `client/package.json`'s `build` script that fails loudly if the file is missing (mirroring the existing `check:env` pattern at the repo root). Pick whichever fits the project's existing test/build conventions — check `client/package.json` and `.project/artifacts/constitution.md`'s Quality Standards before deciding. Document why a CT-only text assertion would NOT have caught this (CT's Vite config already carries the plugin).

## Phase 2: e2e audio capability (determine, don't assume)

- [x] T005 With T001's fix in place, run `npx playwright test --project=e2e` (from `client/`) and specifically determine — by temporarily instrumenting or by writing a throwaway probe test, then removing it — whether `api.playerPositionChanged` now fires under real Playwright-driven playback (a synthetic `.click()` on "Start", no `sendAsParticipant` raw-WS workaround) now that the worker asset actually resolves. Record the answer; it decides T006 vs T007. **Answer: yes** — a real click on "Start" with no raw-WS bypass reaches enabled/ready in ~650ms. The project's prior "Chrome autoplay policy blocks it" belief was never actually correct; it was always this same worker-asset bug.
- [x] T006 [artifacts: ui] If T005 found Playwright-driven playback now progresses on its own: add `client/e2e/lyrics-only-view.spec.ts` — create a session as host, select the synthetic-song fixture, select the Lyrics part, click Start for real, and assert `.full-lyrics-view`'s text content becomes non-empty and matches the fixture's first real LRC line within a reasonable timeout. This is the literal reproduction of the reported bug at the surface (production build via `preview`) that actually exhibited it. **Complete** — verified red (fails/build-blocked pre-fix) and green (passes post-fix).
- [x] T007 (not applicable — T005 found real Playwright-driven playback works; T006 applied instead)

## Phase 3: Artifact corrections

- [ ] T008 [artifacts: infrastructure] Correct `.project/artifacts/infrastructure.md`'s "Font & Worker Setup" section (the `core.scriptFile` bullet). Replace the claim that it unconditionally covers the audio player worker with the confirmed mechanism: alphaTab's ESM build always attempts `new Worker(new URL('./alphaTab.worker.mjs', import.meta.url))` first under Vite-bundled output; `core.scriptFile` is a fallback reached only on a *synchronous* construction error, never triggered by a hanging/404 Worker. Note that the dev server avoids the bug via `optimizeDeps.exclude` changing alphaTab's own bundler-environment detection (not via `core.scriptFile`), and that the production build needed `alphaTabWorkerAssets()` (T001) to actually emit the files that URL requests. Update frontmatter (`last_updated`, keep `status: stable` — this is a correction, not a new open question).
- [ ] T009 [artifacts: ui] Confirm `.project/artifacts/ui.md`'s "Lyrics part selected" section (Playback View) still accurately describes the feature as designed — it does; no changes expected here, since the bug was purely in the build config, not the described behavior. If review finds any drift, correct it; otherwise record in the task's completion note that no change was needed and why (the feedback item's `[artifacts: ui]` tag pointed at the wrong artifact — the real staleness was in infrastructure.md, T008).
- [ ] T010 [parallel] Update `client/e2e/helpers.ts`'s `sendAsParticipant` doc comment to drop the superseded "Chrome's autoplay policy blocks it" claim (contradicted by `playwright.config.ts`'s own comment and this investigation), replacing it with whatever T005 determined is the actual current behavior/reason for the helper's existence.
- [ ] T011 Mark `.project/feedback/feedback-lyrics-only-view-d7d8.md`'s bug item resolved (already flipped to `[x]`/`status: planned` during `/ardd-plan`; confirm no further bookkeeping needed once implementation lands).

## Phase 4: Full verification

- [ ] T012 Run `pnpm -r --if-present run check` (typecheck across all workspaces) — must pass clean.
- [ ] T013 [parallel] Run `pnpm --filter client test` (client vitest) — must pass clean.
- [ ] T014 [parallel] Run `pnpm --filter server test` (server vitest) — must pass clean.
- [ ] T015 Run `npx playwright test --project=ct` (from `client/`) — must pass clean, including the pre-existing lyrics rendering-logic CT coverage.
- [ ] T016 Run `npx playwright test --project=e2e` (from `client/`), including the new test from T006/T007 — must pass clean.
- [ ] T017 Run `/ardd-verify` then `/ardd-analyze` to close the loop on the artifact corrections from Phase 3.
