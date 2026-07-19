---
plan: plan-settings-ux-bundle-2026-07-19-d27d.md
generated: 2026-07-19
status: ready   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Part-name extraction module

- [ ] T001 [artifacts: constitution, ui] Test-first (red, `it.fails`
  markers per the pre-commit-hook convention): create
  `client/src/part-display-name.test.ts` for a pure
  `partDisplayNames(rawNames: string[]): { instrument: string; detail:
  string | null }[]` function. Cases: "Name (Instrument)" → instrument
  prominent, performer name as detail ("M. Bellamy (Vocals)" →
  {Vocals, "M. Bellamy"}; "Chris (bass)" → {Bass, "Chris"} —
  capitalized display form); bare instrument names pass through
  ("Keyboards I" → {Keyboards, "I"}); same-instrument collisions keep
  GP's own qualifiers as detail ("Guitar, lead"/"Guitar, rhythm" and
  "Guitar I"/"Guitar II") and, when no usable qualifier distinguishes
  them, get sequential numbering in track order ({Guitar, "1"},
  {Guitar, "2"}); per-song uniqueness of instrument+detail guaranteed;
  unrecognizable names fall back to the raw name whole ({raw, null});
  dictionary covers guitar/bass/drums/vocals/keys/keyboards/synth/
  piano/strings/brass (case-insensitive; grow-as-needed per plan OQ3).
- [ ] T002 [artifacts: ui] Implement `client/src/part-display-name.ts`
  (pure, no framework imports) making T001 green; remove `it.fails`
  markers. Then wire it into the existing part-name render sites —
  part picker (Song & part modal), participant list's selected-part
  display, and the Playback View "Playing: X" label — rendering
  instrument prominent and detail de-emphasized (smaller/dimmer, kept
  not dropped). Update affected CT/unit tests. Full client suites
  green.
- [ ] T003 [artifacts: ui] Revise ui.md: add the part-name display rule
  (instrument extracted and prominent, detail de-emphasized,
  uniqueness + sequential-numbering fallback, raw-name fallback) where
  parts are described (feedback part-name-instrument-ux F001). Stamp
  `last_updated` via `ardd-state.sh stamp`. No code.

## Phase 2: Tracks tab redesign + Mute all

- [ ] T004 [artifacts: constitution, ui] Test-first (red): CT specs for
  the redesigned Tracks tab rows in the settings modal — each part row
  is exactly one line: display-only label (not a button/interactive
  element; instrument prominent + detail dim, from Phase 1's module),
  marquee-style scroll on overflow (bounce style — scroll to end,
  pause, return; animation active only when the label's content width
  exceeds its container, measured like the lyrics ticker's centering
  does) and no wrapping ever; a small icon-only mute button using
  lucide `volume-off` (muted) / `volume-2` (audible) via the existing
  `Button` iconOnly + tooltip idiom; Solo stays a text button. Also CT
  for the new "Mute all" control (feature `mute-all-parts-button`):
  one action mutes every part (batch `changeTrackMute()`, same
  mechanism as Solo), count-in/metronome unaffected (they come from
  `countInVolume`/`metronomeVolume`, not track channels); pressing it
  when everything is already muted unmutes all (simple toggle, plan
  OQ2 default); per-(song,track) persistence unchanged.
- [ ] T005 [artifacts: ui, brand] Implement the Tracks tab redesign +
  Mute all in `client/src/components/SettingsModal.svelte` (extracting
  a row component if it clarifies): one-line grid rows, marquee label,
  icon mute, text Solo, Mute-all control at the top of the list.
  Remove red markers; client vitest + CT suites green.
- [ ] T006 [artifacts: ui] Revise ui.md's Tracks-tab section text to
  the new row layout (one line, display-only marquee label, icon mute,
  text Solo — feedback settings-tracks-rows F001/F002); the Mute-all
  paragraph from the plan run stands. Stamp `last_updated`. No code.

## Phase 3: Beat widget layout

- [ ] T007 [artifacts: constitution, ui] Test-first (red): CT specs for
  the beat widget layout — the measure display renders to the LEFT of
  the beat count; the beat count's horizontal position is identical in
  count-in mode (measure slot empty/hidden but space reserved) and
  playback mode (measure shown), so the countdown transitions into the
  metronome without the beat number moving; the measure renders as the
  number stacked above a small "MES" caption (no "Measure 12" text).
- [ ] T008 [artifacts: ui, brand] Implement in
  `client/src/components/BeatWidget.svelte`: reorder to
  [measure][beat] with the measure slot's width reserved in both
  modes, stacked number-over-"MES" markup/styles. Remove red markers;
  CT green (existing gating/count tests untouched and passing).
- [ ] T009 [artifacts: ui] Revise ui.md's Count-In & Metronome Beat
  Widget section: measure-left-of-beat with position-stable beat
  count, stacked MES display (feedback beat-widget-layout F001/F002).
  Stamp `last_updated`. No code.

## Phase 4: Live verification + close-out

- [ ] T010 Live verification in a real browser (own server+client on
  non-default ports, scratch catalog as prior runs): (a) Tracks tab —
  rows are single-line; a long label (e.g. TIRO's "M. Bellamy
  (Vocals)") marquees instead of wrapping; icon mute toggles
  volume-off/volume-2; Mute all silences all parts while the metronome
  click still sounds during playback and count-in still clicks;
  (b) part picker + participant list show instrument-prominent names;
  (c) beat widget — start playback with count-in on and watch the
  countdown become the metronome with the beat number not moving, MES
  stack appearing to its left. Record outcomes in a tasks-file note;
  clean up test processes.
