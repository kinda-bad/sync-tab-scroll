---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: widgets-gp5-songswitch
created: 2026-07-18
features: [count-in-metronome-beat-widget, gp5-raw-lyric-line-extraction]
surfaced-defects: []
---

# Plan: Beat widget, GP5 lyric extraction, and the song-switch race fix

## Goal

Deliver the count-in/metronome beat widget in the Bar, GP5 raw-lyric-line
extraction so Supermassive gets the corrected dispatch, and a diagnosed
fix for the song-switch stale-score race.

## Scope

**In:**
- `count-in-metronome-beat-widget` (ui.md Count-In & Metronome Beat
  Widget, added this run): single-shape Bar widget, alternating-direction
  fill animation, count-in mode (4→1, session-wide, gated
  `Session.countInEnabled`) and playback mode (1→4 + labeled measure
  number, personal, gated Metronome preference), beat-boundary timing via
  `api.tickPosition` + `localTempoAtTick`.
- `gp5-raw-lyric-line-extraction` (pipeline.md Legacy GP3–5 Raw-Line
  Extraction, added this run): small binary parse of the GP5 lyrics
  block, publishing the existing `lyricsRawLine`(/`StartBar`) meta
  fields; re-ingest Supermassive Black Hole; verify its ticker against a
  user ear-check.
- Feedback F001 (`feedback-song-switch-stale-score-e030.md`): diagnose
  and fix the song-switch race — switching songs left the old tab view
  rendered AND the old audio playing until a browser refresh.
  Independently corroborated during creep-dispatch T006 live testing:
  host "Change song" + immediate Start can race the score reload,
  leaving the old score+ticker rendered. Diagnosis first (reproduce with
  console/logging, then pin the ordering bug in
  `client/src/playback-engine.ts`/`tab-renderer` score-load vs.
  play sequencing), then fix + regression test.

**Out:**
- Any lyric-dispatch semantics changes (complete as of
  plan-creep-dispatch; GP5 work reuses them untouched).
- `host-mandated-bars-per-row-layout`, `catalogue-co-owner-invite-flow`
  (latter is a retire-by-hand candidate, not planned here).
- Filing the alphaTab upstream issue (separate pending user decision).

## Technical Approach

Three independent work streams sharing no files — ordered in one plan
(this run's scope), but each phase is a self-contained increment:

1. **Beat widget (ui.md)**: a new Bar component (Svelte, like existing
   Bar controls) subscribing to the alphaTab position events the engine
   already exposes; beat boundaries computed from tick + local tempo
   (reuse `tempo-lookup.ts`), count-in phase detected the same way the
   count-in cursor guard does (playback-sync.ts). Personal gating reads
   `metronome-preference.ts`; session gating reads `Session.
   countInEnabled` from the store. Colors via brand.md theme tokens.
   Playwright CT for the mode/gating logic; visual judgment items
   (shape, layout) resolved at implementation per the artifact.
2. **GP5 extraction (pipeline.md)**: extend `readRawLyricsLine` (or a
   sibling) to detect the `FICHIER GUITAR PRO` header and parse the GP5
   lyrics block (track number + five {int32 startBar, length-prefixed
   string} lines); publish the same meta fields. The dispatcher, client
   walk, and `.lrc` generation are already format-agnostic. Re-ingest
   Supermassive; alphaTab parses GP5 for beats, so tie/grace/slide flags
   come from the same model walk as GP7/8.
3. **Song-switch race (feedback F001)**: diagnosis-led like the creep
   plan — reproduce first (the T006 repro recipe: host "Change song" +
   immediate Start), instrument the score-load path, identify whether
   the engine plays before `scoreLoaded`/player-ready for the new song
   or the renderer/synth get out of sync, then the minimal ordering fix
   (likely gating play on the new score's readiness) with a regression
   test at whatever seam the diagnosis exposes.

## Phase Breakdown

**Phase 1 — Song-switch race (F001).** No dependencies. Highest user
pain (data-corrupting UX). Diagnose → fix → test.

**Phase 2 — GP5 raw-line extraction.** No dependencies
(`gp5-raw-lyric-line-extraction`). Test-first binary parse, publish,
re-ingest Supermassive, verification note for a user ear-check.

**Phase 3 — Beat widget.** No dependencies
(`count-in-metronome-beat-widget`). Component + gating + timing, CT
coverage, live check of count-in and playback modes.

**Phase 4 — Close-out.** Depends on 1–3. Prod catalog note (Supermassive
meta needs a volume re-upload to reach prod), STATUS handoff.

## Open Questions

1. Beat widget in non-4/4 time signatures: the register describes 4-beat
   behavior; implementation should read the actual time signature
   (masterBar) rather than hard-coding 4 — confirm that generalization
   is intended (default: yes, count to the bar's numerator).
2. If the song-switch race turns out to be server-side (stale
   `selectedSong` broadcast ordering) rather than client-side, the fix
   moves to the server message handlers — the plan's diagnosis phase
   decides; no separate approval needed unless it grows beyond a
   targeted fix.
3. GP5 lyrics-block parse: if Supermassive's file deviates from the
   documented GP5 layout (version differences GP3/GP4), fall back to
   omitting `lyricsRawLine` (current behavior) and record findings —
   acceptable?
