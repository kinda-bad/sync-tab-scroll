---
plan: plan-lyrics-gap-timing-indicator-2026-07-06.md
generated: 2026-07-06
status: completed
---

# Tasks

## Phase 1: Gap detection & measure/beat math
- [x] T001 [artifacts: ui] Write a unit test (test-first, per constitution
  Principle VII) for a new `client/src/lyrics-gap-timing.ts` module,
  against a constructed/mock alphaTab `Score` fixture with a known
  constant tempo and time signature (e.g. 120bpm, 4/4): assert the
  computed measure-length-in-ms for a given point in the score is
  correct, and that given a gap window `[startMs, endMs]` exceeding that
  measure length, the function returns the correct 4 beat timestamps
  immediately preceding `endMs`. Add a second fixture with a tempo change
  between the gap's start and end, asserting the *local* (nearest-to-
  `endMs`) tempo is used, not the song's first/average tempo. Confirm
  both fail (module doesn't exist yet).
- [x] T002 [artifacts: ui] Implement `client/src/lyrics-gap-timing.ts` to
  make T001's tests pass: given the headless `alphaTabApi` instance and a
  `[startMs, endMs]` gap window, find the score's `MasterBar` nearest
  `endMs` (via `score.masterBars`, each exposing `.start` in ticks and
  `.calculateDuration()` — same API `lyrics-beat-walk.ts` already uses),
  convert its tick length to real time via `api.tickPositionToTimePosition()`
  to get the local measure duration, compare against `endMs - startMs` to
  determine if the gap qualifies, and if so compute the local beat
  duration (measure duration ÷ `timeSignatureNumerator`) and the 4 beat
  timestamps immediately preceding `endMs`. Do NOT use `CatalogSong.bpm`
  (datamodel.md: display-only, not for tick-to-time math).
- [x] T003 [artifacts: ui] In `client/src/playback-engine.ts`'s
  lyrics-sheet branch, stop discarding `.lrc`'s blank gap-marker lines
  (currently filtered via `.filter((l) => l.text.length > 0)` in the
  `isLyricsPart && song.lyricsLrc` branch). Keep the full parsed line
  list as the source of truth for gap detection (including the gap
  before the first real line, treating song start as the gap's
  `startMs`), derive the rendered (real-line-only) list separately for
  building `.lyric-line` elements, and call T002's module for each
  inter-line (and leading) gap to determine which ones qualify for an
  indicator.

## Phase 2: Render dots + drain bar
- [x] T004 [artifacts: ui, brand] Write/extend a Playwright CT spec
  (test-first, per constitution Principle VII), likely in
  `client/src/full-lyrics-view.ct.spec.ts` or a new
  `lyrics-gap-indicator.ct.spec.ts`: using a fixture `.lrc` with a
  qualifying gap (>1 measure) between two lines, assert a gap-indicator
  element is inserted between the correct `.lyric-line` elements (or
  before the first one, for a leading gap) containing exactly 4 dot
  child elements and one drain-bar child element. Simulate playback
  position advancing through the last 4 beats before the gap ends and
  assert dots light up in the correct order (one at a time, matching
  `--lyric-active`/`--lyric-base` per brand.md); assert the drain bar's
  fill value decreases correctly across the full gap window (100% at
  gap start, 0% at gap end). Add a second case with a short gap (≤1
  measure) asserting no indicator element is inserted at all. Confirm
  these fail against the current (Phase-1-only) implementation.
- [x] T005 [artifacts: ui, brand] Implement the DOM insertion (gap-
  indicator element with 4 dot children + 1 drain-bar child) and wire
  the existing `playerPositionChanged` subscription (the same one
  already driving active-line highlighting) to update dot-lit state and
  drain-bar fill continuously, in `client/src/playback-engine.ts`. Make
  T004's tests pass.
- [x] T006 [artifacts: brand] [parallel] Add `.gap-drain-tape` (riot:
  diagonal hazard-stripe visual language, shrinking as the gap elapses)
  and `.gap-drain-led` (cyberpunk: segmented LED-marquee visual language,
  same shrink direction) to `client/src/styles/motifs.css`, gated by
  `data-theme` exactly like the existing `.hazard-stripes`/`.led-marquee`
  rules — both classes present on the drain-bar element unconditionally,
  CSS decides which renders, per this codebase's "components don't
  branch on theme" convention. Use a `--gap-fill` custom property (0–1,
  same pattern as `HazardBar`'s `--hazard-fill`) set by T005's code.
- [x] T007 [artifacts: brand] [parallel] Add dot styling to
  `client/src/lyrics.css` alongside the existing `.lyric-line`/
  `.lyric-line.active` rules — base dots using `--lyric-base`, the
  currently-lit dot using `--lyric-active` (same color-role convention
  the line highlight already uses, no new role).

## Phase 3: Verification
- [x] T008 Live-verify in a real browser, both themes (riot and
  cyberpunk, each in dark and light mode): the real catalog song
  `muse-time-is-running-out` (a ~8.4s gap before its first `.lrc` line)
  shows the dots-and-drain-bar sequence correctly during that leading
  gap; confirm behavior for any other qualifying inter-line gap present
  in the catalog's other songs. Note any song/theme combination that
  looks wrong.
- [x] T009 Run the full test suite (server + client vitest, CT, e2e) and
  confirm everything passes.
