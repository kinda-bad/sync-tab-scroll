---
status: draft
branch: lyrics-ticker-font-size
created: 2026-07-05
features: []
---

# Plan: Lyrics ticker font size

## Goal

Increase the font size of the in-tab lyrics ticker strip (the single-line
horizontal ticker shown when an instrument part is selected, per `ui.md`'s
Playback View) so its text is easier to read.

## Scope

**In scope:**
- Increase `.lyrics-overlay`'s `font-size` in `client/src/styles/motifs.css:185`
  (currently `0.9375rem`).
- Adjust `--lyrics-strip-height` (`client/src/styles/tokens.css:69`, currently
  `3rem`) if the larger font no longer fits comfortably within the strip's
  fixed height, and correspondingly verify `App.svelte:202`'s
  `padding-bottom: calc(var(--lyrics-strip-height) * 2)` (bottom padding
  reserved so the tab notation can scroll clear of the fixed strip) still
  provides enough clearance.

**Out of scope:**
- Any change to the ticker's behavior (scroll/snap/recenter logic, syllable
  highlighting, placeholder state) — this is a pure sizing tweak.
- The full-lyrics headless view ("Lyrics part selected" in `ui.md`), which
  already renders in "large font" and is unaffected by this ticker-specific
  CSS.
- No artifact changes: `ui.md` describes the ticker's structure and behavior
  but doesn't specify pixel/rem-level typography, so this is a pure
  implementation-detail fix with nothing to reconcile against the artifact.

## Technical Approach

Bump `.lyrics-overlay`'s `font-size` token in `motifs.css`. Since
`.lyrics-overlay` uses `display: flex; align-items: center` inside a
fixed-height strip (`height: var(--lyrics-strip-height)`), verify live in a
real browser (per this project's established `browser-verify-alphatab-quirks`
practice — Playwright/vitest can't observe rendered CSS layout) that the
larger text doesn't get clipped by `overflow: hidden`, and bump
`--lyrics-strip-height` if it does. If the strip height changes, re-check
`App.svelte`'s bottom-padding calc still clears the strip when scrolled to
the bottom of a real tab.

## Phase Breakdown

### Phase 1 — Increase ticker font size
- [ ] Increase `.lyrics-overlay`'s `font-size` in `motifs.css` (feedback:
  `feedback-lyrics-ticker-font-size-9411.md`).
- [ ] Live-verify in browser (light + dark theme) that text isn't clipped
  and the active-syllable centering/snap behavior still looks correct at
  the new size.
- [ ] If needed, adjust `--lyrics-strip-height` and re-verify the tab's
  bottom-padding clearance (`App.svelte`'s `.lyrics-overlay-container`
  padding-bottom calc) still keeps the last rows of notation unobscured.

This is a single-phase, single-commit change.

## Complexity Tracking

None — no new principle deviations.

## Open Questions

- Exact target font-size/strip-height values are left to implementation and
  live visual judgment call (no artifact-level spec exists to derive them
  from); not a blocking design question.

## Production Annotation Summary

None — no production shortcuts introduced.
