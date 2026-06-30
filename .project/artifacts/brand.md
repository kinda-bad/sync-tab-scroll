---
name: brand
status: stable
last_updated: 2026-06-30
---

# Brand & Theming

## Overview

Visual identity and "vibe" of the app: color, typography, tone, motion.
Split out from `ui.md` so that artifact stays focused on views, layout,
and interaction states (the code-shaped concerns), while this one owns
look-and-feel decisions a designer would make. `ui.md` references this
artifact rather than restating color/type choices inline.

The rebuild keeps sync-scroll's visual identity — dark, neon-accented,
glitch-titled — deliberately. None of the embarrassment that motivated
this rebuild was about how the app looked; it was about how the code
that built that look was organized. So this artifact's job is mostly to
record the existing direction as a real decision (not an accident left
over from incremental specs), plus resolve the one thing that wasn't
fully decided last time: light mode.

## Color Palette

Dark canvas with neon accents, carried forward from sync-scroll
(`neon-yellow`, `neon-blue` on lyrics/song-title elements). A light-mode
counterpart is in scope for the rebuild (see Light/Dark Mode below) and
needs its own accent treatment — the neon accents are tuned for a dark
background and won't simply invert. Specific palette values (exact
hex/HSL stops for both modes) are a design-pass detail to nail down
during implementation, not a constitution-level decision; this artifact
fixes the *direction*, not the swatches.

## Typography

Keep the old pairing: a distinct display/title font (`font-title`,
tracking-widest) for song titles, monospace (`font-mono`) for metadata
and labels. No reset.

## Voice & Tone

Terse and utilitarian. Toasts, errors, and empty states state the fact
plainly — no personality, no jokes, no exclamation points. This applies
even though the visual direction (neon/glitch) is louder; the voice
doesn't have to match the visual volume.

## Motion & Vibe

Keep the "glitch" title effect (`glitch-title`, `glitch-rule-b`) and the
animated drain-bar/fill-bar lyric-timing visuals. No reset.

## Light/Dark Mode

Both modes are in scope for the initial rebuild — not deferred to a
later feature like sync-scroll did (spec 016). Dark is the default: the
neon accent system is designed against a dark canvas, and that's the
identity being carried forward. Light mode is the explicit alternate a
user can switch to, with its own accent tuning per Color Palette above.
