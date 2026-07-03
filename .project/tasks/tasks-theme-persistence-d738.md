---
plan: plan-theme-persistence-2026-07-03.md
generated: 2026-07-03
status: ready
---

# Tasks

## Phase 1: Fix + regression test

- [x] T001 [artifacts: infrastructure] Write a test first (Principle VII): extend `client/src/playback-engine.ct.spec.ts`. New test: use `page.addInitScript(() => { document.documentElement.dataset.theme = 'light'; })` before `mount(PlaybackEngineHarness, ...)` (so the attribute is set before `PlaybackEngineHarness.svelte`'s `onMount` calls `ensurePlaybackEngine`, matching how `tab-renderer.ct.spec.ts`'s existing `setTheme` test drives theme-dependent color assertions). After mounting, assert the rendered tab's colors match `lightTabColors` (`client/src/brand-colors.ts`) rather than the `darkTabColors` default — e.g. `component.getByTestId('tab-container').locator('svg text').first().evaluate((el) => getComputedStyle(el).fill)` compared against `lightTabColors`'s corresponding value, mirroring `tab-renderer.ct.spec.ts`'s "setTheme visibly changes rendered resource colors" test's assertion style. Confirm this fails against the current code (today it renders in dark colors regardless of `data-theme`, since `ensurePlaybackEngine` hardcodes `theme: 'dark'`).

  Added `a freshly-created engine picks up the document theme instead of hardcoding dark` to `playback-engine.ct.spec.ts`. Resolved `lightTabColors.foreground` to a canonical `getComputedStyle`-format string by round-tripping the rgba values through a throwaway DOM element's `style.color`, rather than hand-formatting an `rgb(...)` literal (no precedent for that in this repo, and it avoids an assumption about alphaTab's exact fill-serialization format). Confirmed red: got `rgb(255, 230, 0)` (dark's foreground) instead of the expected `rgb(138, 106, 0)` (light's foreground).

- [ ] T002 [artifacts: infrastructure] Fix `ensurePlaybackEngine()` in `client/src/playback-engine.ts`: at the top of the function, compute `const theme: Theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';` (mirrors `main.ts`'s `loadStoredTheme() ?? 'dark'` fallback — both agree dark is the default absent any preference). Use this `theme` value for `state.theme`'s initial value (replacing the current hardcoded `'dark'` literal at `state = { api, isLyricsPart, theme: 'dark', ... }`) and pass it as `createTabRenderer()`'s `theme` option (currently only ever called with its default). Run T001's test and confirm it passes.

- [ ] T003 [artifacts: ui] No `ui.md` content change is needed — confirm this rather than skip it silently: `ui.md` never documented the buggy hardcoded-dark behavior in the first place (it already correctly states theme toggling "switches both the app's CSS palette and the tab notation's colors together"), so this is a pure implementation-bug fix bringing code in line with the artifact's existing, already-correct claim — not a design reversal requiring an artifact edit.

## Phase 2: Manual verification

- [ ] T004 Manual verification in a real browser: with dev servers running (note: if starting the server manually rather than via `pnpm --filter server dev` from the repo root, set `CATALOG_ROOT` to the repo root's `catalog/` absolute path, or run from the `server/` directory — the default `./catalog` is relative to cwd and silently resolves to an empty catalog with no error if run from the wrong directory, as found during this session's own live-browser pass). Toggle to light mode via the Settings modal's Settings tab, select an instrument part, refresh the page, and confirm the tab notation now loads directly in light-mode colors (no longer reverting to dark and requiring a manual re-toggle, per this plan's fix). Also confirm dark mode (the default, nothing persisted — e.g. after clearing `localStorage`) still renders correctly unchanged.

## Phase 3: Full suite verification

- [ ] T005 Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and `pnpm --filter client test:e2e`. Confirm every test passes with no regressions. Report final test/file counts.
