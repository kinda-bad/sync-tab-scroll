---
plan: plan-per-song-default-start-point-2026-11-26-5e1d.md
generated: 2026-11-26
status: completed
---

# Tasks

## Phase 1: Contract

- [x] T001 [artifacts: datamodel] [parallel] In `.project/artifacts/datamodel.md`,
      add `CatalogSong.defaultStartBar` (optional, 1-based positive integer
      from `meta.json`; invalid → logged and dropped) and note that a genuine
      `song-select` resets `PlaybackState.tickPosition` to 0. Stamp
      `last_updated`.
- [x] T002 [artifacts: ui] [parallel] In `.project/artifacts/ui.md`, describe
      the default start point (seeded on song select and after every Stop,
      host can override by clicking, including back to bar 1) and that host
      click-to-seek works while stopped as well as paused. Stamp
      `last_updated`.

## Phase 2: Loader and server (test-first)

- [x] T003 Failing tests in `server/src/catalog-loader.test.ts`:
      `defaultStartBar` present (9 → 9), absent (omitted), invalid (`0`, `-1`,
      `2.5`, `"9"`) → omitted with a warning, song still loads. Then add the
      field to `SongMeta`/`CatalogSong` and the loader.
- [x] T004 Failing test in `server/src/handlers/song-select.test.ts`: a
      genuine song change resets `playbackState.tickPosition` to 0;
      re-selecting the same song leaves it. Then implement.

## Phase 3: Client (test-first)

- [x] T005 Failing unit tests for `client/src/default-start.ts`
      `defaultStartTick(score, tickCache, bar)`: uses
      `tickCache.getMasterBarStart`, falls back to `masterBar.start`, returns
      null for an absent/out-of-range bar. Then implement.
- [x] T006 Failing tests in `client/src/playback-sync.test.ts`: stopped at
      target T parks at T; a quantized readback near T doesn't re-seek on
      later calls; a target change re-parks; Stop still parks at 0. Then
      retarget and edge-trigger the stopped reset in `correctDrift`.
- [x] T007 Failing CT test (`client/src/default-start-point.ct.spec.ts`):
      host engine with `defaultStartBar` sends one `seek` to that bar's tick
      once ready; a non-host sends none; a host whose server position is
      already non-zero sends none; the engine parks at a non-zero stopped
      `playbackState.tickPosition`. Then wire seeding into
      `playback-engine.ts`. Found while doing it: the host's own park read
      back one tick off (1920 → 1921) and was re-broadcast as a seek, so the
      seek listener now treats a tick within 10 of its own assignment as an
      echo. Also covered: the lyrics ticker follows a mid-song park, and in
      recording mode (skewed fixture) a seeded bar-9 start begins the audio
      at bar 9's sync point.

## Phase 4: Data and docs

- [x] T008 Back up and set `"defaultStartBar": 9` in
      `catalog/kinda-bad-ii/smashing-pumpkins-1979/meta.json` (gitignored data).
- [x] T009 Add a self-contained "Default start bar" section at the end of
      `docs/catalog-patches.md`; mark the feature implemented.
