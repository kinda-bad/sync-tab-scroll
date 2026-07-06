---
plan: plan-lyrics-ticker-font-size-2026-07-05.md
generated: 2026-07-06
status: in-progress
---

# Tasks

## Phase 1: Increase ticker font size
- [ ] T001 [artifacts: ui] Increase `.lyrics-overlay`'s `font-size` in
  `client/src/styles/motifs.css:185` (currently `0.9375rem`) to a larger,
  more legible value. Pick a concrete value during implementation (no
  artifact-level spec to derive it from) — e.g. try `1.125rem` as a
  starting point and adjust based on the live-verify step below.
- [ ] T002 [artifacts: ui] Live-verify in a real browser (light + dark
  theme, per this project's `browser-verify-alphatab-quirks` practice —
  Playwright/vitest can't observe rendered CSS layout) that the larger
  ticker text isn't clipped by `.lyrics-overlay`'s `overflow: hidden`
  within the fixed-height strip, and that active-syllable
  centering/snap-scroll behavior still looks correct at the new size. This
  is the test for this change — a pure CSS/layout tweak with no scripted
  equivalent.
- [ ] T003 [artifacts: ui] If T002 finds clipping: increase
  `--lyrics-strip-height` (`client/src/styles/tokens.css:69`, currently
  `3rem`) to fit the larger text, then re-verify live that
  `App.svelte:202`'s `padding-bottom: calc(var(--lyrics-strip-height) * 2)`
  still clears the last rows of tab notation when scrolled to the bottom
  of a real tab. Skip this task entirely if T002 finds no clipping.
