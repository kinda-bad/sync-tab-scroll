---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: settings-ux-bundle
created: 2026-07-19
features: [mute-all-parts-button]
surfaced-defects: []
---

# Plan: Settings/Bar UX bundle — mute-all, Tracks-tab rows, part names, beat-widget layout

## Goal

Ship the Settings/Bar UX bundle: a Mute-all control, single-line
Tracks-tab rows with icon mute buttons, prominent extracted instrument
names everywhere parts appear, and the beat widget's
measure-left-of-beat stacked layout.

## Scope

**In:**
- `mute-all-parts-button` (ui.md Tracks-tab addition, applied this run):
  one control muting all parts' MIDI while count-in/metronome clicks
  stay audible; same batch `changeTrackMute()` mechanism Solo uses,
  personal/per-(song,track) persistence.
- `feedback-settings-tracks-rows-0501.md` F001/F002: Tracks tab rows
  become exactly one line each — display-only label with marquee-style
  scroll on overflow (no wrapping); mute becomes a small icon-only
  button (`volume-off` muted / `volume-2` audible, Bar icon-button +
  tooltip idiom); Solo stays a text button (user decision).
- `feedback-part-name-instrument-ux-7b1a.md` F001: extract the
  instrument from raw GP part names and make it the prominent element
  everywhere parts render (part picker, participant list, Song & part
  control, Tracks tab), performer/numbering de-emphasized; unique labels
  per song (GP's own disambiguation preferred, sequential numbering
  fallback in track order); raw-name fallback when unrecognizable.
- `feedback-beat-widget-layout-362c.md` F001/F002: measure display
  moves LEFT of the beat count (beat number keeps its position across
  the count-in→playback transition) and becomes the number stacked over
  a small "MES" caption.
- ui.md artifact revisions for the row layout, part-name display rule,
  and beat-widget layout language (the feedback items are all
  `[artifacts: ui]`).

**Out:**
- Any session-level (shared) mute semantics — all of this stays
  personal/client-local per the existing artifact decisions.
- Server/datamodel changes (part names are derived client-side from
  `Session.availableParts` names; no wire change).
- The remaining backlog items (`sync-tabs-to-real-audio`,
  `host-mandated-bars-per-row-layout`).

## Technical Approach

All client-side, one surface family:

1. **Part-name extraction** is the foundation the other pieces render
   through: a pure module (e.g. `client/src/part-display-name.ts`)
   mapping a song's raw part names to `{instrument, detail}` pairs —
   recognize "Name (Instrument)", bare instrument names, "Instrument
   I/II" numbering; enforce per-song uniqueness of the prominent label
   (keep GP's own qualifiers as the de-emphasized detail; if the
   prominent labels still collide with no usable detail, number
   sequentially in track order); fall back to the raw name whole when no
   instrument is recognizable. Unit-testable against the real catalog's
   name inventory ("M. Bellamy (Vocals)", "Chris (bass)", "Keyboards I",
   "Synth Drums", …). Consumers: part picker, participant list, Playing
   label, Tracks tab.
2. **Tracks tab redesign** builds on 1: one-line rows (CSS
   grid/flex, `overflow: hidden`), display-only label rendering
   instrument-prominent + detail de-emphasized, marquee scroll on
   overflow (CSS animation, active only when content exceeds the
   container — measure like the lyrics ticker's centering does),
   icon-only mute button via the existing `Button`/tooltip idiom, text
   Solo, plus the new Mute-all control (batch mechanism shared with
   Solo).
3. **Beat widget layout** is independent: reorder to
   [measure][beat], measure as stacked number-over-"MES" caption,
   reserving the measure slot's space so the beat count never moves
   between count-in and playback modes.

TDD (Principle VII): unit tests for the extraction module; CT for the
Tracks rows (marquee activation, icon states, mute-all behavior) and the
beat widget layout (position stability across mode transition).

## Phase Breakdown

**Phase 1 — Part-name extraction module** (feedback
part-name-instrument-ux F001). No dependencies. Pure module + tests;
wire into part picker, participant list, and Playing label; ui.md
revision for the display rule.

**Phase 2 — Tracks tab redesign + Mute all** (feature
`mute-all-parts-button`; feedback settings-tracks-rows F001/F002).
Depends on 1 (rows render extracted names). Single-line marquee rows,
icon mute, text Solo, Mute-all; ui.md revision for the row layout.

**Phase 3 — Beat widget layout** (feedback beat-widget-layout
F001/F002). Independent of 1–2. Reorder + stacked MES display; ui.md
revision of the widget section's layout language.

**Phase 4 — Live verification + close-out.** Depends on 1–3. Real
browser pass over all four changes (including count-in→playback
transition stability and marquee on a long name); STATUS handoff.

## Open Questions

1. Marquee style: continuous loop vs. bounce (scroll to end, pause,
   return)? Default: bounce — less distracting in a settings list.
2. Mute-all affordance when already all-muted: toggle back to
   all-unmuted, or restore the previous per-part state? Default: simple
   toggle (all-on), matching Solo's "plain mute-state change" semantics.
3. Instrument extraction dictionary: start with the patterns present in
   the current catalog + common GP names (guitar/bass/drums/vocals/
   keys/synth/piano/strings/brass); unrecognized names fall back whole —
   acceptable to grow the dictionary from real feedback rather than
   aiming for completeness now?
