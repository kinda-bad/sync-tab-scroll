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

The app's identity is dark, neon-accented, and glitch-titled.

## Color Palette

Dark canvas with neon accents (`neon-yellow`, `neon-blue` token names) on
lyrics/song-title elements. Both dark and light modes are in scope (see
Light/Dark Mode below); light mode needs its own accent treatment — the
neon accents are tuned for a dark background and won't simply invert.
Specific palette values (exact hex/HSL stops for both modes) are a
design-pass detail to nail down during implementation; this artifact
fixes the *direction*, not the swatches.

## Typography

A distinct display/title font (`font-title`, tracking-widest) for song
titles; monospace (`font-mono`) for metadata and labels.

## Voice & Tone

Terse and utilitarian. Toasts, errors, and empty states state the fact
plainly — no personality, no jokes, no exclamation points. This applies
even though the visual direction (neon/glitch) is louder; the voice
doesn't have to match the visual volume.

## Motion & Vibe

A "glitch" title effect (`glitch-title`, `glitch-rule-b`) and animated
drain-bar/fill-bar lyric-timing visuals.

## Light/Dark Mode

Both modes are in scope for the initial build. Dark is the default: the
neon accent system is designed against a dark canvas, and that's the
identity this app has. Light mode is the explicit alternate a user can
switch to, with its own accent tuning per Color Palette above.
