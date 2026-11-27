---
plan: plan-lyrics-timing-repeats-2026-11-27-4c1e.md
generated: 2026-11-27
status: completed
---

# Tasks

## Phase 1: Repeat-aware placement

- [x] T001 [artifacts: infrastructure, pipeline] Shared `unrollSyllables`
  + `playbackOrderOf` (packages/shared/src/lyrics-unroll.ts), unit tests
  against a real alphaTab score with a repeat and alternate endings, red first.
- [x] T002 [artifacts: ui, infrastructure] Client ticker: build the overlay
  on `midiLoaded` from `api.tickCache`, syllables and measure markers on the
  playback timeline. CT test through the real engine with a generated
  repeat score, red first.
- [x] T003 [artifacts: pipeline] Pipeline `.lrc`: repeat-aware
  `buildLrc` (a line is emitted once per pass), unit tests red first.

## Phase 2: lrclib time base

- [x] T004 [artifacts: datamodel, infrastructure] `lrc-time-base.ts`:
  `recordingMsToTabMs` + `lrcToTabTime(song, score)`, unit tests red first.
- [x] T005 [artifacts: ui] Wire it into the lyric sheet (active line + gap
  indicators). CT test with an lrclib-style song + sync points, red first.

## Phase 3: Raw-line text

- [x] T006 [artifacts: ui] Strip `+` holds and join `-` syllables in the
  lyric sheet when the `.lrc` text is the raw GP line. Unit + CT tests.

## Phase 4: Specs and verification

- [x] T007 Update ui.md, pipeline.md, infrastructure.md, datamodel.md.
- [x] T008 `pnpm check`, all unit suites, client CT. Record which catalog
  songs need their `.lrc` regenerated.

## Phase 5: Ticker follow-ups (user request)

- [x] T009 [artifacts: ui, brand] Current bar's measure marker highlighted
  (`.lyrics-measure-marker--current`, `--ink`), following the playback
  order through repeats. CT spec red first, checked in all four themes.
- [x] T010 [artifacts: ui] Clear the sung syllable's highlight in a bar
  that starts no syllable; held/tied-only bars count as wordless. CT spec
  red first.

## Notes (2026-11-27)

- Root causes confirmed. Bug 1: `playerPositionChanged.currentTime` is
  alphaTab's synth timeline in both modes (`BackingTrackPlayer` feeds
  `mainTimePositionFromBackingTrack` into `updateTimePosition`). Lazy Eye's
  lrclib times run ahead of tab time by 0.8s at the first line and about
  7.5s by the end (recording 353s vs 345s of tab at 130bpm). Bug 2:
  syllable ticks are `beat.absolutePlaybackStart` (written ticks); the
  pipeline's tempo map and the player both count playback ticks.
- Catalog scan (read-only): only Dirty Little Secret has repeats
  (bars 90–93, `:|x2` with endings on bars 93/94; 109 written bars, 112
  played). Its `lyrics.lrc` needs regenerating; a scratch regeneration
  moves every line from 2:34 on by 5s and adds the second pass of the
  bar-90 line. Creep and Sweetness regenerate byte-identically.
- No regeneration needed for the lrclib fix (client-side conversion) or
  the text cleanup (client-side display).
- Red-first: unroll, buildLrc, lrc-time-base and the CT spec
  (`lyrics-timeline.ct.spec.ts`, 3 of its first 4 tests red against the
  old engine; the raw-text test red with the display call reverted).
