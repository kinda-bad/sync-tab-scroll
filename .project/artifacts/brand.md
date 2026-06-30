---
name: brand
status: draft
last_updated: 2026-06-30
---

# Brand & Theming

## Overview

Visual identity and "vibe" of the app: color, typography, tone, motion.
Split out from `ui.md` so that artifact stays focused on views, layout,
and interaction states (the code-shaped concerns), while this one owns
look-and-feel decisions a designer would make. `ui.md` references this
artifact rather than restating color/type choices inline.

[OPEN: this artifact needs a real working session to fill in — none of
the actual color/type/tone decisions have been made yet for the rebuild.]

## Color Palette

[OPEN: sync-scroll's old client used a dark, neon-accented palette —
classes like `neon-yellow` and `neon-blue` showed up on lyrics/song-title
elements. Confirm whether that direction carries forward or this is a
clean-slate decision.]

## Typography

[OPEN: old app used a distinct display/title font family (`font-title`,
tracking-widest) for song titles and a monospace font (`font-mono`) for
metadata/labels. Confirm or replace.]

## Voice & Tone

[OPEN: not yet discussed — copy tone for toasts, errors, empty states.]

## Motion & Vibe

[OPEN: old app had a "glitch" effect on song titles (`glitch-title`,
`glitch-rule-b`) and animated drain-bars/fill-bars for lyrics timing.
Confirm whether that aesthetic direction is being kept or this is a
reset.]

## Light/Dark Mode

[OPEN: carried over from ui.md's open question — sync-scroll added light
mode as a later feature (spec 016). Decide default mode and whether
both are in scope for the initial rebuild.]
