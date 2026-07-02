---
name: brand
status: stable
last_updated: 2026-07-02
---

# Brand & Theming

## Overview

Visual identity and "vibe" of the app: color, typography, tone, motion.
Split out from `ui.md` so that artifact stays focused on views, layout,
and interaction states (the code-shaped concerns), while this one owns
look-and-feel decisions a designer would make. `ui.md` references this
artifact rather than restating color/type choices inline.

The app's identity is **punk rock**: DIY, torn-paper/hazard-tape
physicality, stark and disciplined rather than a glossy multi-neon
cyberpunk look. (Superseded 2026-07-02 — see UI Chrome Redesign below;
the original "dark, neon-accented, glitch-titled" framing undersold
the direction and is kept below only where it still applies, to Tab
Notation specifically.)

## UI Chrome Redesign (2026-07-02)

A deliberate departure from the prior app (`sync-scroll`), which this
project drew initial inspiration from: `sync-scroll`'s UI runs a full
neon rainbow (pink + blue + green + yellow + red all live at once)
through its chrome, which reads closer to a video-game HUD than punk.
This app narrows that: the **full neon set is reserved for Tab
Notation only** (below — untouched, still locked), where it's
functional (differentiating instrument voices). The UI chrome itself —
the persistent Bar, buttons, cards, forms — runs a stark, disciplined
palette of five semantic roles, deliberately not a rainbow:

| Token | Role |
|---|---|
| `--bg` | base canvas |
| `--surface` | bar/card/panel background |
| `--ink` / `--ink-dim` | primary / secondary text |
| `--riot` | the one loud accent — CTAs, cursor, "live"/active state |
| `--hazard` | caution/pending accent — readiness fill, tape texture |

These are **semantic role names, not theme-specific** (no `--void` vs.
`--paper` split) so that components never branch on which theme is
active — only the values behind each name change per
`[data-theme='...']` block (`client/src/styles/tokens.css`). This is
also what makes the palette extensible: a future theme (e.g. a
straight cyberpunk palette, floated as a long-term goal) is a new
`[data-theme='cyberpunk']` block plus a new toolbar entry in
`.storybook/preview.ts`'s `withThemeByDataAttribute` config — nothing
else changes, no component touches theme-specific logic.

**Dark mode** — a void/stage concept:

| Token | Value |
|---|---|
| `--bg` | `#0a0a0a` |
| `--surface` | `#17171b` |
| `--ink` | `#f2f0e8` |
| `--riot` | `#ff2178` |
| `--hazard` | `#ffcc00` |

**Light mode** — its own pass, not a mechanical inversion: a
photocopied-flyer concept (warm-toner ink on newsprint paper, deeper/
inkier accents rather than dark mode's glow):

| Token | Value |
|---|---|
| `--bg` | `#e4e1d6` (deliberately not cream/`#F4F1EA` — reads as an AI-default) |
| `--surface` | `#d6d2c4` |
| `--ink` | `#131211` |
| `--riot` | `#c40855` |
| `--hazard` | `#a8760a` |

### Signature element: the persistent Bar

One persistent bar, pinned to the **bottom** of the viewport, present
in the Lobby and Playback views both — never a separate top header +
bottom transport-bar split (`sync-scroll`'s pattern, explicitly
rejected: it reads as two different UIs stitched together). Bottom
placement matches transport-control muscle memory (players, DAWs) and
reads like the lip of a stage. Landing has no bar — its own full-screen
moment.

The bar's top edge is a torn/ripped-paper silhouette (`clip-path`
polygon, no image assets — `.torn-edge`, `client/src/styles/motifs.css`)
rather than a clean rule. Its readiness/progress fill is a diagonal
hazard-tape stripe (`.hazard-stripes`) rather than a smooth gradient —
one visual device doing triple duty: per-participant readiness in the
Lobby, playback progress in Playback, and (existing motif, kept) the
lyric-timing drain/fill visual. The combined effect reads as a torn
strip of caution tape stuck across the screen edge — the single most
recognizable, unmistakable element of the redesign.

### Motion: diverges by theme, not just palette

- **Dark** keeps a glitch/chromatic-aberration fringe on the bar's torn
  edge (`.signature-glitch`) — recolored to `--riot`/`--hazard` rather
  than sync-scroll's literal pink/cyan channel split. Broadcast/screen
  distortion suits a void/stage backdrop.
- **Light** swaps this for a **tape-peel** micro-interaction instead
  (`.signature-tape`) — a small torn-tape corner that lifts slightly on
  hover/focus. Same DIY-physical energy, expressed through a different
  medium (paper, not screen) — not a lazy palette-only swap of the same
  effect.

Both respect `prefers-reduced-motion`.

## Color Palette (Tab Notation)

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

**This palette is unchanged by the UI Chrome Redesign above** — it
remains the full neon set, reserved specifically for tab notation's
functional need to differentiate instrument voices, not extended to
the rest of the UI.

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

`--font-display: 'Bungee'` for hero/title moments only (the app
logotype, song title, big state words like READY/LIVE) — bold, blocky,
poster/graffiti energy, more distinctive than the originally-considered
Bebas Neue while staying legible at small sizes. Used with restraint:
everywhere else, including all buttons/labels/lists/forms, is
`--font-mono: 'IBM Plex Mono'` — its typewriter energy suits DIY zine
text, and it shares monospace logic with the tab notation's own fret
numbers. Two roles, not three — restraint over a fuller type system.

## Voice & Tone

Terse and utilitarian. Toasts, errors, and empty states state the fact
plainly — no personality, no jokes, no exclamation points. This applies
even though the visual direction (punk rock, loud) is louder; the voice
doesn't have to match the visual volume.

## Motion & Vibe

Dark mode: a glitch/chromatic-aberration fringe (`.signature-glitch`,
`client/src/styles/motifs.css`) on the persistent Bar's torn edge, and
the "glitch" title effect on hero type. Light mode: a tape-peel
micro-interaction (`.signature-tape`) in its place — see UI Chrome
Redesign above for why these diverge by theme rather than sharing one
effect. Animated hazard-stripe drain/fill visuals (`.hazard-stripes`)
carry per-participant readiness, playback progress, and lyric-timing
highlight — one device, three jobs.

## Light/Dark Mode

Both modes are in scope for the initial build. Dark is the default.
Designed in sequence, dark first, with light built as its own pass
against dark's finished bones (layout, type, the persistent Bar) rather
than a mechanical inversion — the void/stage vs. photocopied-flyer
concepts above are deliberately different metaphors, not the same
metaphor with swapped hex values. One `data-theme` attribute on
`<html>` drives both the UI chrome tokens (`tokens.css`) and the tab
notation's own theme (`brand-colors.ts`, `tab-renderer.ts`'s
`setTheme`) — toggling theme anywhere in the app switches both at once.
Toolbar-driven in Storybook too (`@storybook/addon-themes`), so new
components get built against both themes from the start, not retrofitted.
