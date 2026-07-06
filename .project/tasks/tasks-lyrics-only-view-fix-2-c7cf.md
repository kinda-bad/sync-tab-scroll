---
plan: plan-lyrics-only-view-fix-2-2026-07-06.md
generated: 2026-07-06
status: ready
---

# Tasks

## Phase 1: Reproduce
- [ ] T001 [artifacts: ui, infrastructure] Write a Playwright CT test
  (test-first, per constitution Principle VII) using the existing
  `HeadlessPlayerHarness.svelte` test-harness pattern (see
  `headless-player.ct.spec.ts` for precedent) that: mounts the headless
  player against a fixture song with a real `.lrc` file, simulates
  playback advancing past the first non-empty `.lrc` line's timestamp,
  and asserts `.full-lyrics-view`'s `getComputedStyle(...).display` is
  not `'none'` and its `textContent` becomes non-empty. Confirm this test
  fails against current code. Capture and record in the tasks file (as a
  note under this task) *how* it fails — e.g. `scoreLoaded`/
  `playerPositionChanged` never fire at all for the headless `api`
  (pointing at the render-gate hypothesis in the plan's Technical
  Approach), vs. events do fire but `textContent`/`display` still don't
  reflect it (pointing at something else, e.g. the CSS conflict alone
  being insufficient to explain full invisibility) — this determines
  Phase 2's actual scope.
- [ ] T002 Live-verify in a real browser (this project's
  `browser-verify-alphatab-quirks` practice) with a real two-participant
  session: one participant on an instrument part, one on Lyrics. Confirm
  the CT reproduction in T001 matches real observed behavior, not just a
  test-harness artifact.

## Phase 2: Fix
- [ ] T003 [artifacts: infrastructure] Based on T001's findings: if the
  headless player's `scoreLoaded`/`playerPositionChanged` events are
  confirmed not firing (or firing incorrectly) due to the container's
  `display: none`, change `createHeadlessPlayer`
  (`client/src/headless-player.ts`) to position its container off-screen
  with a real non-zero size instead of `display: none` — e.g.
  `container.style.position = 'absolute'; container.style.left =
  '-99999px'; container.style.width = '800px'; container.style.height =
  '600px';` — so alphaTab's render/tick pipeline sees a real, sized
  element while it still never appears in the visible viewport. Skip
  this task (mark done with a note) if T001's findings point elsewhere
  instead.
- [ ] T004 [artifacts: ui] [parallel] Consolidate the `.full-lyrics-view`
  CSS split: remove the duplicate/conflicting rule from `App.svelte`'s
  scoped `<style>` block (`.full-lyrics-view { display: none; }` /
  `.full-lyrics-view.visible { display: block; }`), and move the
  `display`/`.visible` toggle into `client/src/lyrics.css` alongside its
  existing styling for the same class, changing its visible-state
  `display` to be driven by the same `.visible` class Svelte still
  applies from `App.svelte`'s markup (`class:visible={hasPart &&
  isLyricsPart}` stays in the markup; only the CSS rule's *location*
  changes, so there is exactly one file declaring this element's full
  style instead of two files each partially overriding the other).
- [ ] T005 Make T001's CT test pass.

## Phase 3: Regression coverage & verification
- [ ] T006 [artifacts: ui] Add a permanent CT test (distinct from T001's
  reproduction, or promote/rename it to a permanent spec file e.g.
  `full-lyrics-view.ct.spec.ts`) covering: `.full-lyrics-view` becomes
  visible and shows the correct line text as simulated playback position
  crosses each `.lrc` line boundary in order, using a fixture song with a
  real multi-line `.lrc` file — mirroring `lyrics-overlay.ct.spec.ts`'s
  existing pattern for the in-tab overlay.
- [ ] T007 Live-verify in a real browser, two-participant session again:
  the lyrics-only participant sees line text appear and advance in sync
  with the instrument participant's tab playback, in both light and dark
  theme.
- [ ] T008 Run the full test suite (server + client vitest, CT, e2e).
