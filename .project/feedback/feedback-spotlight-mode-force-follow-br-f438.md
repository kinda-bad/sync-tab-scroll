---
status: planned
created: 2026-07-24
plan: plan-f841-2026-07-24-bdce.md
---

# Feedback

## Bugs
- [x] F001 Spotlight mode force-follow is broken: with Spotlight mode ON, changing the host's lobby cursor never moves/scrolls other participants' view. Verified live via two real browser tabs (T010 manual verification, 2026-07-24) — confirmed the engine was fully ready (real playback correctly advanced and auto-scrolled the cursor in a Start→Stop cycle) yet the force-follow subscription in `client/src/playback-engine.ts` never applied a fresh `lobbyCursorTick` while `spotlightMode` was true. No console errors on either tab. Prime suspect: the `clientStore.subscribe` callback at `playback-engine.ts` (around lines 475-517) early-returns via `if (!s.session || !api.isReadyForPlayback) return;` before reaching the Spotlight-follow block — this may be gating the whole pre-playback Lobby state where Spotlight mode is meant to operate. Root cause needs confirming via a new CT spec (Playwright component test, using the existing `__getApi`/`isReadyForPlayback`-polling pattern already used in `full-lyrics-view.ct.spec.ts`) that reproduces the failure deterministically, then a fix. Full verification notes are in `.project/tasks/tasks-lobby-cursor-modes-0bea.md` under T010. Scenario 1 (Spotlight off → no follow) and Scenario 3 (auto-reset on Start) both verified passing. [artifacts: ui]
