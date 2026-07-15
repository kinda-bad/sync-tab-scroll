---
plan: plan-7f0f-2026-07-14-67d9.md
generated: 2026-07-14
status: in-progress
---

# Tasks

## Phase 1: Gap-indicator lifecycle (F003, F004)
- [x] T001 [artifacts: ui] Write a failing test first (playback-engine unit
  or CT test) asserting that the gap-indicator DOM node created by
  `renderGapIndicators()` in `client/src/playback-engine.ts` is
  removed/hidden once `updateGapIndicators(currentTimeMs)` observes
  `currentTimeMs` past `gap.endMs`. Then implement the hide/remove logic
  so both the `.gap-drain` (drain bar) and its child `.gap-dot` (count-in
  dots) elements clear once their gap has fully elapsed, instead of
  staying frozen in the DOM. Addresses feedback F003, F004.

## Phase 2: Count-in dots as inline lyric prefix (F006)
- [x] T002 [artifacts: ui] Write a failing CT test first asserting the
  count-in dots render as an inline prefix on the upcoming `.lyric-line`
  text (e.g. "···· You will be") and clear/resolve into the plain line
  text at the right time. Then, in `client/src/playback-engine.ts`,
  change `renderGapIndicators()`/the gap-indicator `insertBefore` call
  (~L206) to render dots inline within the associated `.lyric-line`
  instead of as a separate element positioned above it; remove the
  now-unused above-line CSS in `client/src/lyrics.css`'s
  `.gap-indicator`/`.gap-drain` rules (~L74-97, including the
  `flex-basis:100%` own-line rule) as needed. Depends on T001's
  lifecycle change already existing. Addresses feedback F006.

## Phase 3: First-line/syllable pre-highlight fix (F005)
- [x] T003 [artifacts: ui] [parallel] Write a failing test first asserting
  no lyric line or syllable is `.active` immediately after `.lrc`/song
  load, and only becomes active once playback position data confirms its
  timestamp has been reached. Then, in `client/src/playback-engine.ts`,
  remove the `setActiveLine(0)` call in the `.lrc` fetch handler (~L248)
  and change the `playerPositionChanged` handler's (~L258-271) default
  `index` from `0` to `-1` (no line active) until a real position update
  clears it. In `client/src/lyrics-overlay.ts`'s `updateActiveSyllable`
  (~L71-86), guard the first syllable so a `tickPosition === 0` entry
  doesn't flip active before a genuine `playerPositionChanged` event
  arrives (the synchronous placeholder highlight at ~L88-93 stays, but
  must not leak into the same active state as real syllable highlighting).
  Addresses feedback F005.

## Phase 4: Syllable highlight timing offset (F001)
- [x] T004 [artifacts: ui] [parallel] Instrument
  `api.playerPositionChanged`'s reported tick against actual audio
  playback time for a known song (TIRO or Creep) to locate where the
  ~2-syllable-ahead offset originates — compare the syllable list's
  `tickPosition` values (as consumed by `updateActiveSyllable` in
  `client/src/lyrics-overlay.ts` ~L71-86) against the tick reported by
  the position event. Write a regression test first that pins a specific
  tick to its expected active-syllable index for a sample syllable list,
  covering the previously-observed off-by-~2 case, then correct the
  offset at its source (either the syllable-to-tick mapping data or the
  reported position tick, whichever is found to drift). Addresses
  feedback F001.

## Phase 5: Lobby/lyrics single scroll region (F002)
- [ ] T005 [artifacts: ui] Write a failing CT test first asserting only
  one scrollable container is present when the lyrics view is active,
  and that lobby content is not visible/interactable once scrolled past.
  Then, in `client/src/App.svelte` (~L128-142), unify `.app-content`
  (wrapping `<Lobby/>`) and `.full-lyrics-view` into a single scroll
  container — or explicitly hide/collapse `.app-content` when
  `hasPart && isLyricsPart` is true — so only one vertical scrollbar
  exists and the lobby display can fully scroll out of view. Addresses
  feedback F002.
