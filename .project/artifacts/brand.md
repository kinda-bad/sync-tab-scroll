---
name: brand
status: stable
last_updated: 2026-07-06
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

**Reworked 2026-07-06 — "riot"**: the UI Chrome palette below was pushed
louder and wilder, drawing on Yeah Yeah Yeahs album/gig-poster art
(*Fever to Tell*'s scrawled collage-red, gig-poster bone-ribcage-on-black
with magenta blood-splatter) and Nirvana's *In Utero* (cracked, yellowed
parchment; deep blood-red serif type) — still the same punk-rock
identity and the same five semantic roles, just hotter values and a
grittier light-mode metaphor (decayed parchment, not clean photocopy).
This is a value-level rework of the existing theme, not a new theme
alongside it — see Themes below for how it now coexists with the new
**cyberpunk** theme as a second, fully distinct option.

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
| `--surface` | card/panel background |
| `--bar-surface` | the persistent Bar's own background — distinct from `--surface` so the Bar reads as its own layer against the cards/panels behind it, not camouflaged into them |
| `--ink` / `--ink-dim` | primary / secondary text |
| `--riot` | the one loud accent — CTAs, cursor, "live"/active state |
| `--hazard` | caution/pending accent — readiness fill, tape texture |

These are **semantic role names, not theme-specific** (no `--void` vs.
`--paper` split) so that components never branch on which theme is
active — only the values behind each name change per
`[data-theme='...']` block (`client/src/styles/tokens.css`). This is
also what makes the palette extensible: **Themes** below documents how
this now supports two fully distinct themes (`riot`, `cyberpunk`), each
with its own dark/light pair — a new theme is a new pair of
`[data-theme='...']` blocks plus a new toolbar entry in
`.storybook/preview.ts`'s `withThemeByDataAttribute` config — nothing
else changes, no component touches theme-specific logic.

**Dark mode** — a void/stage concept, pushed louder in the 2026-07-06
"riot" rework (Yeah Yeah Yeahs/Nirvana-inspired — see above): hotter
magenta-pink `--riot`, hotter marigold `--hazard`, a warmer near-black
base than the original neutral void:

| Token | Value |
|---|---|
| `--bg` | `#050403` |
| `--surface` | `#150e10` |
| `--bar-surface` | `#2b1018` |
| `--ink` | `#f3e6c8` |
| `--riot` | `#ff0857` |
| `--hazard` | `#ffb400` |

**Light mode** — its own pass, not a mechanical inversion: reworked from
a photocopied-flyer concept into a **decayed, cracked parchment**
concept (per *In Utero*'s cover — yellowed, brittle paper; deep
blood-red serif type), warm-toner ink on aged paper rather than clean
newsprint:

| Token | Value |
|---|---|
| `--bg` | `#ece0b8` |
| `--surface` | `#ddcb92` |
| `--bar-surface` | `#c2a35c` |
| `--ink` | `#160f0c` |
| `--riot` | `#9c0f3a` |
| `--hazard` | `#8a5200` |

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
rather than a clean rule.

The readiness/progress fill — a diagonal hazard-tape stripe
(`.hazard-stripes`) rather than a smooth gradient — is **not** part of
the bar itself. It renders as its own independently `position: fixed`
strip pinned to the **top** of the viewport (`HazardBar.svelte`,
mounted in its own `.hazard-wrap` by `Bar.svelte`, `top: 0`), decoupled
from the bottom-pinned nav bar (`.bar-wrap`, `bottom: 0`) — moved there
specifically so it's never sandwiched between the nav bar and the main
content. Same `progress` prop, same one-device-triple-duty role
(per-participant readiness in the Lobby, playback progress in
Playback, and the lyric-timing drain/fill visual), just anchored to the
opposite screen edge from the bar it originally shared a container
with. The combined effect — a torn strip of caution tape stuck across
the top of the screen, with the bottom-pinned nav bar as its own
separate torn-edge element — is still the single most recognizable,
unmistakable pairing of the redesign, just no longer literally one
element.

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

## Themes

Two fully distinct themes, each with its own dark/light pair — orthogonal
controls (per `ui.md`'s Preferences tab): a **theme** picker (`riot` /
`cyberpunk`) and the existing light/dark toggle, combining into four flat
`data-theme` values: `dark`, `light` (theme `riot`, the default — see UI
Chrome Redesign above for its palette), `cyberpunk-dark`,
`cyberpunk-light`. `riot` keeps the `dark`/`light` values rather than
being renamed to `riot-dark`/`riot-light`, since it's a rework of the
original default theme in place, not a new theme added alongside it.

### Cyberpunk

Direct harvest of the predecessor project's (`sync-scroll`) full-neon
chrome palette — the very look this app's UI Chrome Redesign (above)
deliberately narrowed *away* from for its own default theme. `cyberpunk`
is where that multi-neon "video-game HUD" identity gets to exist as its
own selectable option instead.

**`cyberpunk-dark`** — harvested directly from `sync-scroll/client/src/
styles/main.css`'s `--color-void`/`--color-panel`/`--color-rail`/
`--color-neon-pink`/`--color-neon-blue`:

| Token | Value |
|---|---|
| `--bg` | `#08080c` |
| `--surface` | `#111118` |
| `--bar-surface` | `#1c1c26` |
| `--ink` | `#e8f6ff` |
| `--riot` | `#ff2d78` |
| `--hazard` | `#00cfff` |

Because `--riot` and `--hazard` are now a genuine pink/cyan pair (not two
shades of the same warm accent, as in `riot`), the existing
`.signature-glitch` motif — already a two-channel border fringe,
per Motion above — renders as a **literal** pink/cyan chromatic-
aberration split here, the same effect `sync-scroll` used, with zero new
component logic: it's the same mechanism, just fed a theme where the two
tokens are actually different hues.

**`cyberpunk-light`** — fresh design pass, no `sync-scroll` equivalent to
harvest (it never shipped light mode); a "holographic display" concept,
lower confidence than the dark pass above, same caveat this artifact
already applies to any non-harvested palette:

| Token | Value |
|---|---|
| `--bg` | `#eef3f7` |
| `--surface` | `#dbe7ee` |
| `--bar-surface` | `#c3d6e0` |
| `--ink` | `#0c1420` |
| `--riot` | `#d6006b` |
| `--hazard` | `#0090b8` |

**Motion**: adds `sync-scroll`'s CRT scanline overlay (a `body::after`
repeating-linear-gradient texture) as a third theme-scoped motion variant,
gated `[data-theme='cyberpunk-dark'], [data-theme='cyberpunk-light']` —
same per-theme-motion pattern the Motion section above already uses for
`riot` dark (glitch) vs. light (tape-peel), just a third value rather than
a new mechanism. No tape-peel/glitch-fringe-recolor equivalent is needed
beyond the existing `.signature-glitch` reuse described above.

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

**`cyberpunk` theme.** `cyberpunk-dark` reuses this section's existing
dark-mode table as-is — full-brightness neon-yellow/neon-blue is already
the right look, no changes needed. `cyberpunk-light` is a fresh pass
(same lower-confidence caveat as the `riot`-light table above), pushing
cyan/magenta instead of amber/rose to match the Themes section's
"holographic display" concept:

| Role | Token | Value | alphaTab resource / class |
|---|---|---|---|
| Note glyphs (fret numbers, notes, stems, beams, bend/slur geometry) | `--tab-foreground` | `#00b7dd` (deep cyan) | `mainGlyphColor` (flat — same constraint as above) |
| Ghost notes, ties | `--tab-foreground-dim` | `rgba(0,183,221,0.40)` | `secondaryGlyphColor` |
| Bar numbers | `--tab-foreground-dim` | same as ghost notes/ties | `barNumberColor` |
| Section labels | `--tab-foreground-dim` | same as ghost notes/ties | `scoreInfoColor` |
| Staff lines | `--tab-ruling-dim` | `rgba(214,0,107,0.35)` (magenta) | `staffLineColor` |
| Barlines | `--tab-ruling-mid` | `rgba(214,0,107,0.50)` | `barSeparatorColor` |
| Playback cursor | — | `#d6006b`, near-opaque (matches chrome `--riot`) | `.at-cursor-bar` / `.at-cursor-beat` |
| Active/currently-sung lyric syllable | — | same magenta as cursor | in-tab `.at-highlight`, lyrics view line-highlight |
| Base (non-highlighted) lyric text | — | `#00647d`, deep cyan-teal | full lyrics view |
| Lobby pre-playback pointer | — | `#00647d` — same cyan-family/magenta-family split as dark mode | lobby cursor overlay |

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
