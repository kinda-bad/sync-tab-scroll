---
plan: plan-lyrics-ticker-2026-07-03.md
generated: 2026-07-03
status: ready
---

# Tasks

## Phase 1: Ticker rendering + centering

- [x] T001 [artifacts: ui] Write a test first (Principle VII): update `client/src/lyrics-overlay.ct.spec.ts`'s second test ("overlays on top of the tab notation") — it should still pass unchanged (position stays `fixed`). Add a new test: after mounting `LyricsOverlayHarness` and driving the tick to activate a syllable (e.g. `drive(page, 150)` to activate "you"), assert the active `.lyric-syllable.at-highlight` span's bounding-box horizontal center is within a small pixel tolerance (e.g. 2px) of `.lyrics-overlay`'s own bounding-box horizontal center — use `page.locator(...).boundingBox()` for both and compare `x + width / 2`. Confirm this new test fails against the current flowing/wrapping layout (nothing centers today).
  - Done: added "centers the active syllable horizontally within the strip" test; existing "overlays on top" test left unchanged and still passes. Ran `pnpm --filter client test:ct` scoped to this file — new test failed red as expected (574.7px off-center vs 2px tolerance), the other two passed. Confirms Principle VII red state before any implementation.

- [ ] T002 [artifacts: ui] In `client/src/lyrics-overlay.ts`: wrap the existing per-syllable `span` creation in a new inner track element (e.g. `.lyrics-track`, `display: inline-flex`, appended into `.lyrics-overlay` instead of appending spans directly to it). In `updateActiveSyllable`, after toggling `at-highlight`, compute `translateX = overlay.clientWidth / 2 - (activeSpan.offsetLeft + activeSpan.offsetWidth / 2)` and apply it via `track.style.transform = \`translateX(${translateX}px)\``. Guard the `activeIndex === -1` case (before the first syllable activates) to leave the track at its natural untransformed position. Add a `window` `resize` listener that recomputes the same formula for whichever syllable is currently active (skip if `activeIndex === -1`); store the listener reference and remove it in `destroy()` alongside the existing `playerPositionChanged.off(handler)` call.

- [ ] T003 [artifacts: ui] Update `client/src/styles/motifs.css`'s `.lyrics-overlay`/`.lyric-syllable` rules: change `.lyrics-overlay` from `flex-wrap: wrap` to a fixed-height, `overflow: hidden` viewport strip (`white-space: nowrap`, no wrapping); add a new `.lyrics-track` rule (`display: inline-flex`, `white-space: nowrap`, `transition: transform 0.25s ease` so the centering slides rather than jump-cuts). Run T001's tests and confirm both pass — the unchanged "overlays on top" test and the new centering test.

- [ ] T004 Manual verification in a real browser: with dev servers running, select an instrument part whose lyrics track differs from the viewed track, start playback, and confirm lyrics now render as a single continuous line (no line wrapping) that visibly scrolls right-to-left as syllables advance, with the active syllable staying centered in the strip. Resize the browser window mid-playback and confirm the active syllable re-centers rather than drifting off-position.

## Phase 2: Scroll padding under the tab

- [ ] T005 [artifacts: ui] Add `--lyrics-strip-height` to `client/src/styles/tokens.css` (a single value shared across both themes, alongside `--bar-height` — this is a layout dimension, not a themed color, so no dark/light variants needed). Pick a value that comfortably covers `.lyrics-overlay`'s rendered height (check `padding`/`font-size` in `motifs.css` — currently `padding: var(--space-2) var(--space-3)` plus one line of `0.9375rem` text; size the token generously enough for the single-line ticker's actual height, not the old multi-line `max-height: 40%` bound which no longer applies).

- [ ] T006 [artifacts: ui] In `client/src/App.svelte`'s `<style>` block, add `padding-bottom: var(--lyrics-strip-height)` to the existing `.engine-containers.visible` rule (currently just `display: block`, per the block starting `.engine-containers.visible,\n  .full-lyrics-view.visible {`). Note in a code comment (mirroring the plan's own noted simplification) that this reserves space whenever an instrument part is visible at all, not only while the lyrics overlay is actively toggled on — `toggleOverlay()`'s show/hide state isn't currently exposed outside `playback-engine.ts`'s module closure, so this is an accepted minor inefficiency (unused padding when lyrics are toggled off) rather than new reactive plumbing.

- [ ] T007 Manual verification in a real browser: scroll an instrument-part tab all the way down while the lyrics ticker is visible; confirm the last row(s) of notation can be scrolled clear of the fixed strip (not permanently hidden behind it), regardless of playback state.

## Phase 3: Artifact revision

- [ ] T008 [artifacts: ui] Revise `.project/artifacts/ui.md`'s Playback View lyrics-overlay description (instrument-part bullet) to describe the single-line, center-snapping ticker (fixed bottom strip, right-to-left scroll, active syllable centered, snap-not-continuous) in place of the current multi-line flowing-strip description. Bump `last_updated`, set `diagram_status: stale` (unless already `unrendered`).

## Phase 4: Full suite verification

- [ ] T009 Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and `pnpm --filter client test:e2e`. Confirm every test from Phases 1-3 passes alongside the existing suite, with no regressions. Report final test/file counts.
