---
status: draft
branch: theme-persistence
created: 2026-07-03
features: []
---

# Plan: Theme Persistence Fix

## Goal

Fix a live-browser-confirmed bug: a persisted theme preference correctly
applies to the app's CSS chrome on load, but silently reverts to dark for
the tab notation every time a fresh playback engine is created, because
`ensurePlaybackEngine()` hardcodes `theme: 'dark'` instead of reading the
current/persisted value.

## Scope

**In scope:**
- `ensurePlaybackEngine()` (`client/src/playback-engine.ts`) initializes a
  new engine's theme from the document's current `data-theme` attribute
  (already set correctly on startup by `main.ts`'s `applyTheme(loadStoredTheme()
  ?? 'dark')` call) instead of a hardcoded `'dark'` literal — both the
  initial `state.theme` value and the `theme` option passed to
  `createTabRenderer()`. [feedback: theme-persistence-bed6 Bug #1]

**Out of scope, deferred (not forgotten):**
- Any change to `theme.ts`'s public API shape (`loadStoredTheme`/
  `persistTheme`/`applyTheme`) — the bug is entirely in
  `playback-engine.ts` not consulting the already-correct document state,
  not in how that state gets set in the first place.
- Any change to `SettingsModal.svelte`'s theme toggle UI — unaffected;
  toggling while an engine is already alive already works correctly today
  (confirmed live), this bug is specifically about a *freshly created*
  engine's initial value.

## Technical Approach

**Read the document's current theme directly, no new module dependency**:
`theme.ts` already imports `setEngineTheme` from `playback-engine.ts` (so
that `applyTheme()` can sync a live engine) — importing something back
from `theme.ts` into `playback-engine.ts` would create a circular import.
Instead, `ensurePlaybackEngine()` reads
`document.documentElement.dataset.theme` directly (the same attribute
`theme.ts`'s `applyTheme()` already sets, and the same one `tokens.css`'s
`[data-theme='...']` blocks key off), defaulting to `'dark'` if unset —
mirroring `main.ts`'s own `loadStoredTheme() ?? 'dark'` fallback exactly,
so both places agree on what "no preference yet" means. This value seeds
both `state.theme` (replacing the current hardcoded `'dark'` literal) and
`createTabRenderer()`'s `theme` option (which already accepts a `theme`
parameter, currently only ever passed the default) — so a freshly
rendered tab starts in the correct theme immediately, rather than
starting dark and waiting for a manual re-toggle to correct itself.

## Phase Breakdown

### Phase 1: Fix + regression test
- Write a test first (Principle VII): extend `client/src/playback-engine.ct.spec.ts`
  — before mounting/creating the engine, set
  `document.documentElement.dataset.theme = 'light'`, then call
  `ensurePlaybackEngine(...)` and assert the resulting tab renderer's
  colors match `lightTabColors` (e.g. via the same
  `getComputedStyle(...).backgroundColor`-on-`.at-cursor-bar`-style
  assertion `tab-renderer.ct.spec.ts`'s existing theme test already uses,
  or a comparable check against `brand-colors.ts`'s `lightTabColors`
  values) — not the `darkTabColors` default. Confirm it fails against the
  current hardcoded-`'dark'` code.
- Fix `ensurePlaybackEngine()` in `client/src/playback-engine.ts`: read
  `document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'`
  once at the top of the function, use it for both `state.theme`'s
  initial value and `createTabRenderer()`'s `theme` option. Run the new
  test and confirm it passes.
- **[artifacts: ui]** No `ui.md` content change needed — the artifact
  never claimed the buggy hardcoded behavior in the first place; this is
  a pure code fix correcting an implementation bug, not a documented
  design reversal. (Tagged `[artifacts: ui]` per the feedback item's own
  tag, satisfied by confirming no artifact edit is actually required
  here — noted rather than silently skipped.)

### Phase 2: Manual verification
- Manual verification in a real browser: toggle to light mode, select an
  instrument part, refresh the page, and confirm the tab notation loads
  directly in light-mode colors (no longer reverting to dark and
  requiring a manual re-toggle). Also confirm dark mode (the default,
  nothing persisted) still works unchanged.

### Phase 3: Full suite verification
- Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and
  `pnpm --filter client test:e2e`. Confirm every test passes with no
  regressions. Report final test/file counts.

## Complexity Tracking

None — a one-line read of an already-set DOM attribute, no new
abstraction, no new module.

## Open Questions

None outstanding.

## Production Annotation Summary

None anticipated.
