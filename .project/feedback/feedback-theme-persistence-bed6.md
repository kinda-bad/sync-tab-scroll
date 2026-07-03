---
status: planned
created: 2026-07-03
plan: plan-theme-persistence-2026-07-03.md
---

# Feedback

## Bugs
- [x] Persisted theme preference doesn't apply to a freshly-created tab-notation renderer, only to the document-level CSS palette. Confirmed via live browser: toggled to light mode, refreshed the page — the app chrome (background, hazard strip, bar, headings) correctly loaded in light mode, but the rendered tab notation stayed in dark-mode colors indefinitely (not just a brief race; persisted across multiple seconds and re-screenshots). Root cause confirmed by reading the code: `main.ts:10` calls `applyTheme(loadStoredTheme() ?? 'dark')` at startup, before any playback engine exists — `theme.ts`'s `applyTheme()` calls `setEngineTheme()`, which is a documented no-op when no engine is active yet (`playback-engine.ts`'s `state` is `undefined` at that point). Later, when a song/part is actually selected, `ensurePlaybackEngine()` (`playback-engine.ts:44`) always hardcodes `state = { ..., theme: 'dark', ... }` on creation — it never reads the persisted/current theme at all. So a light-mode preference sticks for the app chrome but silently reverts to dark for the tab notation on every fresh load, until the user manually re-toggles via the Settings modal. Fix needs `ensurePlaybackEngine` to initialize `state.theme` from the current persisted/document theme (e.g. read `document.documentElement.dataset.theme`, or have `theme.ts` expose the current value) instead of a hardcoded `'dark'`. [artifacts: ui]
