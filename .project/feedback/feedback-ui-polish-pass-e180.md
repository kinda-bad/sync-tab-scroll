---
status: open
created: 2026-07-03
plan: null
---

# Feedback

## Bugs
- [ ] The playback cursor is never visible during playback. `ui.md` documents alphaTab's native cursor overlay (`.at-cursor-bar`/`.at-cursor-beat`) as the mechanism for an instrument-part view; in practice no cursor is showing up. [artifacts: ui]
- [ ] It's impossible to set a cursor position by clicking — likely the same root cause as the cursor-visibility bug above, but called out separately since it's a distinct interaction failure (click-to-seek), not just a rendering gap. `DEFECTS.md` previously verified `playback-engine.ts`'s host-only, paused-only `seek` behavior as matching `ui.md`'s click-to-position spec; this no longer holds in practice. [artifacts: ui]
- [ ] The in-tab lyrics overlay renders stuffed at the bottom of the view instead of overlaid on top of the tab notation, as `ui.md` specifies (`.at-highlight` toggled on top of the rendered tab). If overlaying on the tab turns out not to be feasible, we want to discuss alternative placements before committing to a fix. [artifacts: ui]

## UX
- [ ] In dark mode, the persistent bottom bar should have a fill color that's visually differentiated from its surroundings — currently it doesn't read as distinct. [artifacts: brand]
- [ ] The song and part selection menu should move into a modal, openable/closable from the nav bar, rather than living inline in the Lobby view. It should open automatically whenever no song or no part is currently selected. [artifacts: ui]

## Reconsidered
- [ ] Remove the hazard-tape stripe fill (`.hazard-stripes`) from the persistent bar — it isn't earning its keep. This reverses `brand.md`'s "Signature element: the persistent Bar" section, which calls the diagonal hazard-tape stripe fill "the single most recognizable, unmistakable element of the redesign" and has it doing triple duty (Lobby readiness, Playback progress, lyric-timing drain/fill). Removing it likely also affects how per-participant readiness and playback progress are visually communicated, and interacts with the dark-mode bottom-bar fill-color item above. [artifacts: brand]
