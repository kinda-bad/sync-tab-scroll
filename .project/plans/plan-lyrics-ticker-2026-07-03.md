---
status: approved
branch: lyrics-ticker
created: 2026-07-03
features: []
---

# Plan: Lyrics Ticker

## Goal

Replace the just-shipped multi-line flowing lyrics overlay with a
single-line horizontal ticker: fixed at the bottom of the tab viewport,
scrolling right-to-left, snapping so the currently active syllable is
centered — and make sure the tab has enough scroll room that its last
rows are never permanently hidden behind the strip.

## Scope

**In scope:**
- Rework `.lyrics-overlay`'s rendering from a wrapping multi-line block
  to a single-line (`white-space: nowrap`) strip with a horizontally
  translated inner track.
- Snap-to-center on each active-syllable change (CSS-transitioned
  `transform: translateX(...)`), recomputed on window resize.
- Reserve enough bottom padding under the rendered tab (`.engine-containers`)
  that a user can scroll the tab clear of the fixed strip.
- Revise `ui.md`'s Playback View lyrics-overlay description accordingly
  (this plan's resolution of `feedback-lyrics-ticker-bfd9.md`).

**Out of scope (explicitly deferred, not forgotten):**
- Continuous per-frame scrolling (gliding between syllables based on
  fractional tick progress) — snap-to-center only, for now, per the
  feedback item's own wording.
- Any change to `lyrics-beat-walk.ts`'s `groupIntoLines`/`lyricLineBreaks`,
  the pipeline that produces them, or `datamodel.md`'s
  `CatalogSong.lyricLineBreaks` field. `createLyricsOverlay` already
  flattens its `lines` parameter and never used the grouping for layout
  even before this plan (`lines.flat()`, pre-existing, not something this
  plan introduces) — this ticker redesign doesn't touch that, it only
  changes how the already-flat syllable stream is rendered. Whether
  `lyricLineBreaks` is worth keeping at all, given nothing reads it for
  layout, is a separate question for a future `/ardd-verify` pass, not
  this plan.
- The headless lyrics-part experience (`full-lyrics-view`, driven
  directly by `.lrc` timestamps) — unrelated to this overlay entirely.

## Technical Approach

**Single-line strip**: `.lyrics-overlay` keeps its current `position: fixed`
bottom placement (Phase 2 of `plan-ui-polish-pass-2026-07-03.md`) but
changes from `flex-wrap: wrap` to a fixed-height, `overflow: hidden`
viewport containing one new inner element — a syllable *track*
(`display: inline-flex`, `white-space: nowrap`, no wrapping) that holds
all the `.lyric-syllable` spans in one continuous row. The outer strip
never scrolls itself; the track's `transform: translateX(...)` is what
moves.

**Centering, no alphaTab dependency**: unlike the per-beat-positioned
design discussed and set aside, this needs zero alphaTab bounds lookups
— every syllable's horizontal position comes from ordinary DOM layout
(`span.offsetLeft`/`offsetWidth`) within our own track element, which we
fully control. On each syllable-activation change (the same
`updateActiveSyllable` already driven by `api.playerPositionChanged`),
compute:

```
translateX = stripWidth / 2 - (activeSpan.offsetLeft + activeSpan.offsetWidth / 2)
```

and apply it to the track's `transform`, with a CSS `transition` so it
slides rather than jump-cuts. Before the first syllable activates
(`activeIndex === -1`), the track stays at its natural start position
(first syllable visible at the strip's left edge) — there's nothing to
center yet.

**Resize**: a `window resize` listener recomputes the same formula for
whichever syllable is currently active — trivial, since it's a single
arithmetic recalculation against already-known DOM measurements, not a
layout regeneration (this is the key difference from the per-beat
approach's resize problem, which needed alphaTab to fully re-layout and
regenerate `boundsLookup`).

**Padding under the tab**: `client/src/App.svelte`'s `.engine-containers`
already isn't the thing that scrolls (the whole page is), matching the
existing pattern for the persistent Bar (`.app-content.with-bar`'s
`padding-bottom: calc(var(--bar-height) + var(--space-8))`, already
clearing the Bar). Add a new `--lyrics-strip-height` custom property
(alongside `--bar-height` in `tokens.css`) and give `.engine-containers.visible`
a matching `padding-bottom`, so the tab can be scrolled far enough that
its last rows clear the fixed strip regardless of playback state.
Simplification, noted rather than hidden: this reserves the space
whenever an instrument part is visible at all, not only while the
overlay is actively toggled on (`toggleOverlay()`'s existing show/hide
state isn't currently exposed outside `playback-engine.ts`'s module
closure) — a minor, acceptable inefficiency (unused padding when lyrics
are toggled off) rather than new reactive plumbing to reclaim it
precisely.

## Phase Breakdown

### Phase 1: Ticker rendering + centering
- Update `client/src/styles/motifs.css`'s `.lyrics-overlay`/`.lyric-syllable`
  rules: single-line strip, new `.lyrics-track` inner element, transition
  on `transform`. [addresses feedback: lyrics-ticker-bfd9 Reconsidered]
- Update `client/src/lyrics-overlay.ts`: wrap syllable spans in the new
  track element; on each active-syllable change, compute and apply the
  centering `translateX`; add a resize listener that recomputes it for
  the current active syllable, torn down in `destroy()` alongside the
  existing `playerPositionChanged` unsubscribe.
- Update `client/src/test-harness/LyricsOverlayHarness.svelte` and
  `client/src/lyrics-overlay.ct.spec.ts` (both already exist from the
  prior lyrics-overlay work) to match the new single-line/centering
  behavior — the existing "overlays on top of the tab notation" test
  should still pass unchanged (position is still `fixed`); the
  highlight test needs updating for whatever DOM structure changes
  (track element wrapping); add a new test asserting the active
  syllable's centered position (e.g. its bounding-box center is within a
  small tolerance of the strip's own center) after driving a tick.
- Verify in a real browser: during playback, lyrics visibly scroll
  right-to-left as syllables advance, and the active syllable sits
  centered in the strip.

### Phase 2: Scroll padding under the tab
- Add `--lyrics-strip-height` to `client/src/styles/tokens.css` (a
  single value shared across themes — this is a layout dimension, not a
  themed color, so it doesn't need dark/light variants).
- Add `padding-bottom: var(--lyrics-strip-height)` to `.engine-containers.visible`
  in `client/src/App.svelte`. [addresses feedback: lyrics-ticker-bfd9 UX]
- Verify in a real browser: scroll an instrument-part tab all the way
  down; confirm the last row(s) of notation can be scrolled clear of the
  fixed lyrics strip, not permanently hidden behind it.

### Phase 3: Artifact revision
- **[artifacts: ui]** Revise `ui.md`'s Playback View lyrics-overlay
  description (instrument-part bullet) to describe the single-line,
  center-snapping ticker instead of the multi-line flowing strip. Bump
  `last_updated`.

## Complexity Tracking

None — no new architectural pattern; the centering logic is plain DOM
measurement/CSS transform, the same category of technique already used
elsewhere in this app (e.g. the hazard-stripe fill's `--hazard-fill`
custom property driving a CSS transform/gradient).

## Open Questions

None outstanding — snap-vs-continuous and top-vs-bottom were both
resolved with the user before drafting (snap, bottom).

## Production Annotation Summary

None anticipated.
