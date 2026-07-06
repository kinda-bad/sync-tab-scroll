---
status: draft
branch: lyrics-gap-timing-indicator
created: 2026-07-06
features: [lyrics-gap-timing-indicator]
surfaced-defects: [e50d45a7, b853c817]
---

# Plan: Lyrics gap timing indicator

## Goal

In the full-lyrics-sheet view, instrumental gaps longer than one measure
get a beat-synced four-dot countdown and a theme-styled drain bar instead
of a silent wait — closing the "how much longer" gap the just-redesigned
all-lines sheet doesn't otherwise answer.

## Scope

**In scope:**
- Detecting `.lrc` gaps (including the gap before the very first line —
  the same case that originally looked like a bug) longer than one
  measure's real-time length, computed from the headless instance's own
  loaded score at that point in the song.
- Rendering four dots between the two lines the gap separates, each
  lighting up on one of the 4 beats immediately preceding the next line.
- Rendering a separate, theme-styled drain bar positioned above the
  upcoming line, draining continuously over the gap's full duration.
- `ui.md`/`brand.md` updates (already applied this pass).

**Out of scope:**
- A trailing gap *after* the last line (an outro with no next line to
  "precede") — no indicator makes sense there; this plan only handles
  gaps between two real lines, or before the first one.
- The in-tab lyrics ticker overlay (instrument-part view) — untouched;
  this is specific to the full-lyrics-sheet (Lyrics-part) view.
- Any change to `.lrc` generation/pipeline — the gap markers this reads
  already exist in the file format (pipeline.md).

## Technical Approach

**Gap detection**: `client/src/lrc-parser.ts`'s `parseLrc` already emits
blank-text lines marking a real line's end timestamp (its docstring
already describes this); `playback-engine.ts`'s current lyrics-sheet
builder discards them via `.filter((l) => l.text.length > 0)`. Stop
discarding — keep the full parsed line list (including gap markers) as
the source of truth for gap detection, and derive the *rendered* line
list (real lines only) separately from it.

**Measure/beat-duration math**: a new module (e.g.
`client/src/lyrics-gap-timing.ts`) takes the headless `alphaTabApi`
instance (already loaded — same instance driving the shared clock) and a
gap's `[startMs, endMs]` window, and:
1. Finds the score's `MasterBar` nearest `endMs` (via the score's
   `masterBars`, each exposing `.start` in ticks and `.calculateDuration()`
   — already used elsewhere in this codebase, `lyrics-beat-walk.ts`).
2. Converts that masterbar's tick length to real time via the API's own
   `tickPositionToTimePosition()` (tempo-aware, not a fixed-BPM
   approximation) to get "how long is one measure" at that point in the
   song.
3. If `endMs - startMs` exceeds that measure length, the gap qualifies.
   Computes the local beat duration (measure length ÷
   `timeSignatureNumerator`) and derives the 4 beat timestamps
   immediately preceding `endMs`.

This deliberately does **not** use `CatalogSong.bpm` (datamodel.md: display-
only, not for tick-to-time math) — local tempo comes from the score's own
tempo automations at the relevant point, correctly handling tempo changes
mid-song. Known simplification, documented as an open question below:
a tempo change *within* the last measure or the 4-beat window is treated
as constant at that masterbar's tempo — a rare case, acceptable
approximation per this project's existing "document the default, don't
block on it" convention (e.g. `datamodel.md`'s consent-recording
open questions).

**Rendering**: extend the full-lyrics-sheet DOM builder
(`playback-engine.ts`) to insert a gap-indicator element between the two
`.lyric-line` elements a qualifying gap separates (or before the first
`.lyric-line` for a leading gap), containing 4 dot elements and a drain
bar. Wire the existing `playerPositionChanged` subscription (same one
already driving active-line highlighting) to: light each dot as its beat
timestamp is reached, and continuously shrink the drain bar's fill from
100% (gap start) to 0% (gap end) — same `--hazard-fill`-style custom
property mechanism `HazardBar.svelte` already uses, just on a new,
separate element (brand.md: not a second `HazardBar` instance).

**Styling**: dots use `--lyric-active`/`--lyric-base` (no new color role).
The drain bar gets two theme-specific CSS treatments in `motifs.css` — a
new `.gap-drain-tape` (riot, diagonal hazard-stripe language, shrinking)
and `.gap-drain-led` (cyberpunk, segmented LED-marquee language,
shrinking) — both classes present on the element unconditionally per this
codebase's existing "components don't branch on theme" convention, CSS
per-`data-theme` selectors decide which renders.

## Phase Breakdown

### Phase 1 — Gap detection & measure/beat math
- [ ] Write a unit test (test-first, per constitution Principle VII) for
  the new `lyrics-gap-timing.ts` module: given a constructed/mock score
  fixture with a known constant tempo and time signature, assert correct
  measure-length-in-ms and correct 4-beat-timestamp computation for a
  gap window. Include a second fixture with a tempo change between the
  gap's start and end, asserting the *local* (near-`endMs`) tempo is
  used, not the song's first/average tempo. Confirm both fail against
  no implementation.
- [ ] Implement `lyrics-gap-timing.ts` to make the tests pass.
- [ ] Update `lrc-parser.ts` usage in `playback-engine.ts` to stop
  discarding blank gap-marker lines; derive the rendered (real-line-only)
  list separately, and compute qualifying gaps (including a leading gap
  before the first real line) via the new module.

### Phase 2 — Render dots + drain bar
- [ ] Write/extend a CT spec (test-first) covering: a qualifying gap
  inserts a gap-indicator element with 4 dot children and a drain-bar
  child, positioned between (or before) the correct `.lyric-line`
  elements; as simulated playback position advances through the last 4
  beats, dots light up in the correct order and the drain bar's fill
  value decreases correctly across the full gap window; a non-qualifying
  (short) gap inserts no indicator at all. Confirm these fail against
  the current (Phase 1-only) implementation.
- [ ] Implement the DOM insertion and `playerPositionChanged` wiring in
  `playback-engine.ts` to make the tests pass.
- [ ] Add `.gap-drain-tape`/`.gap-drain-led` to `motifs.css` per
  `brand.md`'s Lyrics Gap Indicator section, and dot styling to
  `lyrics.css` alongside the existing `.lyric-line`/`.lyric-line.active`
  rules.

### Phase 3 — Verification
- [ ] Live-verify in a real browser, both themes: a real catalog song
  with a known instrumental intro (e.g. `muse-time-is-running-out`, ~8.4s
  before its first line) shows the dots-and-drain-bar sequence correctly
  during that leading gap, and any other qualifying inter-line gap in the
  catalog behaves the same way.
- [ ] Run the full test suite (server + client vitest, CT, e2e).

## Complexity Tracking

None — no new principle deviations. The drain bar reuses the existing
`--hazard-fill`-style custom-property mechanism (just a new element, per
brand.md's explicit note that it's not a second `HazardBar` instance);
the "components don't branch on theme" convention is followed exactly as
established for every other theme-scoped motif.

## Open Questions

- Mid-bar/mid-window tempo changes are approximated as constant at the
  nearest masterbar's tempo (see Technical Approach) — a documented
  simplification, not expected to matter for this catalog's real songs,
  revisit only if a specific song's rapid tempo automation makes the
  countdown visibly wrong.
- Exact visual sizing/positioning of the drain bar and dot spacing is
  left to implementation and live visual judgment, consistent with this
  project's practice of fixing direction over exact pixel values until
  validated live.

## Production Annotation Summary

None — no production shortcuts introduced.
