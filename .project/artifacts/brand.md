---
name: brand
status: stable
last_updated: 2026-07-01
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

Dark canvas with neon accents (`neon-yellow`, `neon-blue`, `neon-pink`
token names) carrying distinct roles: yellow for note/lyric content,
blue for staff structure, pink for whatever is *active right now*
(cursor, currently-sung lyric). Both dark and light modes are in scope
(see Light/Dark Mode below); light mode needs its own accent treatment —
the neon accents are tuned for a dark background and won't simply invert.
Dark-mode values below are harvested from the prior app's real production
implementation (sync-scroll), not a fresh guess — they're proven, not a
design-pass placeholder. Light mode has no equivalent to harvest (see
Tab Notation & Playback Cursor below) and remains a design-pass detail to
nail down during implementation, per this artifact's general practice of
fixing *direction*, not swatches, until values are actually validated.

### Tab Notation & Playback Cursor

Live-rendered tab notation (infrastructure.md) picks up the neon identity
rather than staying neutral — the score reads as part of the same
glitch/neon world as the rest of the app. Dark-mode values, harvested
from the prior app's production CSS:

| Role | Token | Value | alphaTab resource / class |
|---|---|---|---|
| Note glyphs (fret numbers, notes, stems, beams, bend/slur geometry — everything `mainGlyphColor` covers) | `--tab-foreground` | `#ffe600` (full-brightness neon-yellow) | `mainGlyphColor` (flat — see note below) |
| Ghost notes, ties | `--tab-foreground-dim` | `rgba(255,230,0,0.40)` (dim neon-yellow) | `secondaryGlyphColor` |
| Bar numbers | `--tab-foreground-dim` | same as ghost notes/ties | `barNumberColor` |
| Section labels ("Verse", "Chorus" — `EffectMarker`; `EffectTempo` is suppressed entirely, shown in the app's transport UI instead) | `--tab-foreground-dim` | same as ghost notes/ties — deliberately reused, not a new meaning | `scoreInfoColor` |
| Staff lines | `--tab-ruling-dim` | `rgba(0,207,255,0.40)` (dim neon-blue) | `staffLineColor` |
| Barlines | `--tab-ruling-mid` | `rgba(0,207,255,0.50)` (mid neon-blue, brighter than staff lines so bar boundaries read clearly) | `barSeparatorColor` |
| Playback cursor | — | `neon-pink`, near-opaque | `.at-cursor-bar` / `.at-cursor-beat` |
| Active/currently-sung lyric syllable | — | `neon-pink`, near-opaque — same "active, right now" meaning as the cursor | in-tab `.at-highlight` overlay, full lyrics view line-highlight |
| Base (non-highlighted) lyric text | — | `neon-yellow` | full lyrics view |
| Lobby pre-playback pointer (`Session.lobbyCursorTick`) | — | `neon-yellow` — deliberately *not* pink, distinguishing "someone is pointing here" (anticipatory) from "this is playing right now" (active) | lobby cursor overlay |

**Revised during implementation**: the original plan called for a 3-way
split within `mainGlyphColor` — bright fret-number text, dim default
strokes, and a distinct pink tone for bend/slur geometry — recovered via
direct CSS selectors on alphaTab's live SVG element types (text nodes vs.
stroked paths), on the theory that live rendering's real semantic DOM
would let a modern CSS approach replace the prior app's sentinel-color-
then-CSS-fill-match hack (necessary there only because static
pre-rendered SVG couldn't be recolored any other way).

That plan turned out to be wrong: verified empirically (live-rendered SVG
DOM inspected in a real browser, alphaTab v1.8.3) that every glyph —
fret numbers, stems, beams, bend arrows alike — renders as a `<text>`
element carrying no distinguishing class, only a resource-assigned
`fill`. There is no CSS selector that can separate "fret-number text"
from "default stroke" from "bend geometry" within `mainGlyphColor`; they
are the same role with no sub-structure to target. `mainGlyphColor` is
therefore one flat value (full-brightness, matching the old app's
highest-emphasis choice for legibility), not three.

A feature request has been drafted for `@coderline/alphatab` asking for
either finer-grained resource-color settings or stable semantic classes/
attributes on rendered glyphs, which would let this artifact's original
3-way intent be revisited if it lands upstream. Until then, the flat
value above is the real, current design — not a placeholder.

**Light mode — proposed, not harvested.** The prior app never shipped
light mode for tab notation, and its draft spec was internally
inconsistent (its own sentinel-routing table contradicted its real
dark-mode CSS), so nothing was safe to port. These values are a fresh
design pass: same role-to-color mapping as dark mode, saturated
jewel-tones rather than pastels — deepened, not just inverted, so the
identity stays energetic rather than washed out against a light canvas.
Confidence is lower than the harvested dark-mode table above; treat exact
values as a first pass to refine visually during implementation, not
production-proven like dark mode's.

| Role | Token | Value | alphaTab resource / class |
|---|---|---|---|
| Note glyphs (fret numbers, notes, stems, beams, bend/slur geometry) | `--tab-foreground` | `#8a6a00` (deep amber-gold) | `mainGlyphColor` (flat — see dark-mode note above; same constraint applies) |
| Ghost notes, ties | `--tab-foreground-dim` | `rgba(138,106,0,0.45)` | `secondaryGlyphColor` |
| Bar numbers | `--tab-foreground-dim` | same as ghost notes/ties | `barNumberColor` |
| Section labels | `--tab-foreground-dim` | same as ghost notes/ties | `scoreInfoColor` |
| Staff lines | `--tab-ruling-dim` | `rgba(0,114,168,0.45)` (deep cyan-blue) | `staffLineColor` |
| Barlines | `--tab-ruling-mid` | `rgba(0,114,168,0.60)` | `barSeparatorColor` |
| Playback cursor | — | `#a3134f`, near-opaque (deep rose) | `.at-cursor-bar` / `.at-cursor-beat` |
| Active/currently-sung lyric syllable | — | same deep rose as cursor | in-tab `.at-highlight`, lyrics view line-highlight |
| Base (non-highlighted) lyric text | — | `#8a6a00`, matching notation's default tone | full lyrics view |
| Lobby pre-playback pointer | — | `#8a6a00` — same yellow-family/pink-family split as dark mode | lobby cursor overlay |

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
