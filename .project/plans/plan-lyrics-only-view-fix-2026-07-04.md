---
status: approved        # draft -> approved -> superseded
branch: lyrics-only-view-fix
created: 2026-07-04
features: []
---

# Plan: lyrics-only-view-fix

## Goal

Fix the full-screen synced lyrics view (ui.md "Lyrics part selected")
rendering nothing in practice, and correct the artifact documentation that
described the underlying worker fix as more complete than it actually was.

## Scope

**In scope:**
- The production Vite build (`vite build`/`vite preview`, what
  `pnpm --filter client build` and the `e2e` Playwright project actually
  exercise) never resolving alphaTab playback readiness, because the ESM
  synth/render worker (`alphaTab.worker.mjs`) it requests is never emitted
  into `dist/assets/`.
- Correcting `infrastructure.md`'s "Font & Worker Setup" section, which
  currently claims `core.scriptFile` covers alphaTab's audio player worker
  unconditionally — it doesn't; that's a fallback only reached on a
  synchronous construction error, never triggered by a hanging/404'd
  Worker. The dev server happens to avoid the bug via a different,
  unrelated mechanism (`optimizeDeps.exclude` changes alphaTab's own
  bundler-environment detection), not via `core.scriptFile`.
- Correcting `client/e2e/helpers.ts`'s `sendAsParticipant` comment, which
  attributes the same symptom (readiness never resolving under Playwright)
  to Chrome's autoplay policy — that diagnosis is superseded by
  `playwright.config.ts`'s own comment and this investigation; the real
  cause was the same missing-build-asset bug, now fixed. Whether readiness
  now resolves under Playwright automation without the raw-WS workaround is
  an empirical question this plan's tasks answer before touching the
  helper.
- A regression test that fails on the actual reported defect (blank
  full-screen lyrics text) and would have caught it, run against a real
  build/preview surface — not just CT (CT already carries the working
  plugin, so a CT-only assertion passes whether or not the production
  config is fixed).

**Out of scope:**
- Any new placeholder/loading state for the full-screen lyrics view before
  the first LRC line's timestamp is reached (the in-tab ticker overlay has
  a "…" placeholder for this; the full-screen view does not). Not reported,
  not required to fix the bug — noted as a possible future `/ardd-feedback`
  item, not built here.
- `datamodel.md`'s 3 pre-existing open questions (unrelated, already
  tracked, not touched by this fix).

## Root Cause (verified, not assumed)

Reproduced via a real (non-Playwright) Chrome session against both
`pnpm --filter client build && preview` and `pnpm dev`, with network
inspection:

- alphaTab's ESM bundle unconditionally attempts
  `new Worker(new URL('./alphaTab.worker.mjs', import.meta.url), {type:
  'module'})` first, under any Vite-bundled/Webpack-bundled environment
  detection — regardless of `settings.core.scriptFile`/`core.useWorkers`.
  `core.scriptFile` is a fallback reached only inside a `catch` for a
  *synchronous* construction failure; a `Worker` pointed at a 404/hanging
  URL never throws synchronously (`new Worker()` doesn't throw on 404), so
  the fallback path is dead code for this failure mode.
- Under `vite build`, this resolves to a request for
  `/assets/alphaTab.worker.mjs`, which `client/vite.config.ts` never
  emitted (confirmed: absent from `dist/assets/`). The request hangs
  forever with zero console error, permanently blocking
  `soundFontLoaded`/readiness for every participant's alphaTab instance —
  most visibly the lyrics-only view, since it has zero fallback content
  (an instrument participant at least sees a static, if unsynced,
  rendered tab).
- Under `pnpm dev`, `client/vite.config.ts` already excludes
  `@coderline/alphatab` from `optimizeDeps` — this changes alphaTab's own
  environment self-detection (not `core.scriptFile`) enough that it skips
  the ESM-URL Worker attempt entirely at dev time. Verified empirically:
  dev already works today, both readiness and live text through real
  playback. This was not previously verified and the existing code
  comments' explanation of *why* dev works were plausible but unconfirmed;
  this plan's tasks correct them to reflect the confirmed mechanism.
- `playwright.config.ts`'s `ctViteConfig` already carries a
  `generateBundle`-based fix (`alphaTabWorkerAssets()`) for the CT
  project's own Vite config, with a comment flagging the production build
  as an open, un-actioned follow-up. This plan applies the equivalent to
  `client/vite.config.ts` (already done, see Phase 1 — the fix was
  developed and empirically verified before this plan was written, per
  this session's investigation).

## Technical Approach

Reuse the existing, already-proven `alphaTabWorkerAssets()` pattern from
`playwright.config.ts` in `client/vite.config.ts`'s `plugins` array, so the
production build emits the same three ESM worker files
(`alphaTab.worker.mjs`, `alphaTab.worklet.mjs`, `alphaTab.core.mjs`) into
`dist/assets/` that the CT project already does. No changes to
`tab-renderer.ts` or `playback-engine.ts` — the lyrics-view text-update
logic itself was already correct (proven via the existing CT harness
before this plan).

## Phase Breakdown

### Phase 1 — Fix (done; verify + regression-guard it)
1. Add `alphaTabWorkerAssets()` to `client/vite.config.ts`'s `plugins`
   array (mirrors `playwright.config.ts`). **[complete]**
2. Verify: `pnpm --filter client build` emits
   `dist/assets/alphaTab.worker.mjs` (and `.worklet.mjs`/`.core.mjs`).
   **[complete, verified]**
3. Verify end-to-end in a real (non-Playwright) browser against the
   rebuilt preview server: create a session, select the lyrics-only part,
   confirm readiness resolves and lyric text renders through real
   playback. Repeat against `pnpm dev` to confirm no regression there.
   **[complete, verified]**
4. Add a deterministic build-time regression guard: after
   `vite build`, assert `dist/assets/alphaTab.worker.mjs` exists. This is
   the cheapest test that actually fails on the real defect (a CT-only
   text assertion would pass regardless, since CT's Vite config already
   has this plugin).

### Phase 2 — e2e audio capability (determine, don't assume)
5. With the build fix in place, run the existing `e2e` Playwright project
   and determine empirically whether `playerPositionChanged` now fires
   under Playwright automation without `sendAsParticipant`'s raw-WS
   `readiness-update: ready` workaround. This was an open question the old
   (now-superseded) autoplay-policy theory never actually settled.
6. If real Playwright-driven playback now works: add an e2e test that
   selects the Lyrics part, starts playback for real, and asserts
   `.full-lyrics-view` contains the expected line text at some point
   during playback — the literal reproduction of the reported bug, at the
   surface that actually exhibited it (production build via preview).
7. If Playwright-driven playback still cannot progress on its own
   (autoplay or some other automation-specific gate genuinely still
   blocks it): keep the existing `sendAsParticipant`-driven readiness path
   for other e2e tests, and instead add a narrower e2e assertion that
   doesn't depend on real synth playback progressing — e.g. drive
   readiness via the existing raw-WS helper, then assert the full-lyrics
   view populates once `playerPositionChanged` can be observed. Document
   whichever mechanism is used and why, since the next person mustn't
   inherit the old wrong "autoplay blocks everything, don't bother" belief
   as a still-unquestioned assumption either.

### Phase 3 — Artifact corrections `[artifacts: infrastructure, ui]`
8. Correct `infrastructure.md`'s "Font & Worker Setup" section: replace
   the claim that `core.scriptFile` covers the audio player worker
   unconditionally with the confirmed mechanism (ESM-URL Worker attempted
   first always; `core.scriptFile` is an unreached fallback for this
   failure mode; dev works via `optimizeDeps.exclude` changing alphaTab's
   bundler detection, not via `core.scriptFile`; production build needs
   the `alphaTabWorkerAssets()` plugin to emit the worker files it
   requests). Addresses this feedback item — filed as `[artifacts: ui]`,
   but the actual stale documentation is in `infrastructure.md`; `ui.md`'s
   own description of the full-screen lyrics view was already accurate.
9. Update `client/e2e/helpers.ts`'s `sendAsParticipant` comment to drop
   the superseded "Chrome's autoplay policy blocks it" claim, replacing it
   with whatever Phase 2 actually determined.
10. Mark the `feedback-lyrics-only-view-d7d8.md` bug item resolved.

### Phase 4 — Full verification
11. Run `pnpm -r --if-present run check` (typecheck across all
    workspaces).
12. Run client vitest (`pnpm --filter client test`).
13. Run server vitest (`pnpm --filter server test`).
14. Run `npx playwright test --project=ct` (from `client/`).
15. Run `npx playwright test --project=e2e` (from `client/`), including
    the new test from Phase 2.
16. `/ardd-verify` + `/ardd-analyze` to close the loop on the artifact
    changes.

## Complexity Tracking

No deviations from the simplicity principle — this reuses an existing,
already-proven pattern (`alphaTabWorkerAssets()`) rather than introducing
a new mechanism.

## Open Questions

- Whether Playwright-driven playback can now progress on its own
  post-fix (Phase 2, step 5) — determines which of steps 6/7 applies.
  Not a design decision, an empirical one; resolved during implementation.

## Production Annotation Summary

None — this is a bug fix restoring already-designed behavior, not a new
production shortcut.
