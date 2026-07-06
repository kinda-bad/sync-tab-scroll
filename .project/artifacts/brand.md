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
grittier light-mode metaphor. This is a value-level rework of the
existing theme, not a new theme alongside it — see Themes below for how
it now coexists with the new **cyberpunk** theme as a second, fully
distinct option.

**Revised again 2026-07-06 (second pass)**: the first rework's values read
as too close to each other and too muted — real punk needs harder
contrast, not just warmer near-blacks. Pushed further (below): `--bg` to
true black in dark mode and near-white (not parchment-tan) in light mode,
`--riot`/`--hazard` to fully saturated blood-red and safety-yellow. This
pass also makes the torn-paper/hazard-tape motifs (Signature element,
below) and their tape-peel motion **exclusive to `riot`** — previously
these were shared geometry that `cyberpunk` merely recolored, which read
as two palettes on one shape rather than two distinct identities.
`cyberpunk` gets its own signature devices instead (see Themes below):
analog/physical (paper, tape) vs. digital/glitch (circuit, LED,
corruption) are now opposed on purpose.

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

**Dark mode** — a void/stage concept, pushed to true high-contrast punk
voltage in the second 2026-07-06 pass: true-black base (not a warm
near-black) so the accents have real void to scream against, a fully
saturated blood-red-pink `--riot` and true safety-yellow `--hazard`
(both maximum saturation, not muted marigold/magenta):

| Token | Value |
|---|---|
| `--bg` | `#000000` |
| `--surface` | `#120a0d` |
| `--bar-surface` | `#1f0a12` |
| `--ink` | `#fff4e0` |
| `--riot` | `#ff0033` |
| `--hazard` | `#ffe600` |

**Light mode** — its own pass, not a mechanical inversion. First reworked
into a decayed-parchment concept, then revised again: don't be afraid of
white — a stark, near-white photocopied-flyer/zine paper (not a
clinical AI-default cream, and not the parchment-tan of the first
rework either) gives sharper contrast for the ink and accent to work
against, closer to a xeroxed punk show flyer than aged parchment:

| Token | Value |
|---|---|
| `--bg` | `#fafaf5` |
| `--surface` | `#efece2` |
| `--bar-surface` | `#e2ddc9` |
| `--ink` | `#0d0704` |
| `--riot` | `#ff0033` |
| `--hazard` | `#c77700` |

`--riot` is the same fully-saturated value as dark mode here — the
near-white background supports full saturation without the accent
reading murky, so there's no need to deepen it the way the first
rework's parchment background required.

### Signature element: the persistent Bar

One persistent bar, pinned to the **bottom** of the viewport, present
in the Lobby and Playback views both — never a separate top header +
bottom transport-bar split (`sync-scroll`'s pattern, explicitly
rejected: it reads as two different UIs stitched together). Bottom
placement matches transport-control muscle memory (players, DAWs) and
reads like the lip of a stage. Landing has no bar — its own full-screen
moment. The bar's own physical treatment (edge silhouette, progress-fill
device, and motion) is now **theme-scoped** — see below for `riot`'s
torn-paper/hazard-tape identity and Themes' Cyberpunk section for its
own distinct glitch-cut/LED-marquee identity.

**`riot`'s bar** — torn paper and hazard tape, per the album-art
inspiration above:

The bar's top edge is a torn/ripped-paper silhouette (`clip-path`
polygon, no image assets — `.torn-edge`, `client/src/styles/motifs.css`),
gated to `riot` (`[data-theme='dark'], [data-theme='light']`) — no
longer a shared shape other themes merely recolor.

The readiness/progress fill — a diagonal hazard-tape stripe
(`.hazard-stripes`), also `riot`-scoped — rather than a smooth gradient
is **not** part of the bar itself. It renders as its own independently
`position: fixed` strip pinned to the **top** of the viewport
(`HazardBar.svelte`, mounted in its own `.hazard-wrap` by `Bar.svelte`,
`top: 0`), decoupled from the bottom-pinned nav bar (`.bar-wrap`,
`bottom: 0`) — moved there specifically so it's never sandwiched between
the nav bar and the main content. Same `progress` prop, same
one-device-triple-duty role (per-participant readiness in the Lobby,
playback progress in Playback, and the lyric-timing drain/fill visual),
just anchored to the opposite screen edge from the bar it originally
shared a container with. The combined effect — a torn strip of caution
tape stuck across the top of the screen, with the bottom-pinned nav bar
as its own separate torn-edge element — is `riot`'s single most
recognizable, unmistakable pairing.

### Motion: diverges by theme, not just palette

`riot`'s signature motion is **tape-peel** (`.signature-tape`) in
**both** modes now — a small torn-tape corner on the bar's edge that
lifts slightly on hover/focus. Previously dark mode used a
glitch/chromatic-aberration fringe instead (recolored from
`sync-scroll`'s literal pink/cyan channel split to `--riot`/`--hazard`);
that motion has moved to `cyberpunk` exclusively (see Themes below),
since `riot`'s identity is entirely physical/tactile — paper, tape,
peeling — and a screen-distortion effect didn't fit that world. `riot`
never uses glitch, in either mode, now.

Respects `prefers-reduced-motion`.

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

Because `--riot` and `--hazard` are a genuine pink/cyan pair (not two
shades of the same warm accent, as in `riot`), `cyberpunk`'s glitch
motion (below) renders as a **literal** pink/cyan chromatic-aberration
split, the same effect `sync-scroll` used.

**Signature devices — digital/glitch, opposed to `riot`'s analog/
physical identity on purpose (second 2026-07-06 revision):**

- **Bar edge**: a jagged, stepped **glitch-cut** silhouette
  (`.glitch-cut-edge`) instead of `riot`'s torn-paper curve — a
  `clip-path` polygon of sharp right-angle notches (a corrupted-signal
  read: hard digital steps, not an organic tear). `cyberpunk`-scoped
  (`[data-theme='cyberpunk-dark'], [data-theme='cyberpunk-light']`),
  replacing `.torn-edge` for this theme entirely — no shared edge shape
  with `riot` anymore.
- **Progress/readiness fill**: a segmented **LED marquee** bar
  (`.led-marquee`) instead of `riot`'s diagonal hazard-tape stripe —
  blocky rectangular segments with small gaps between them, hard edges,
  a subtle glow (`box-shadow`) on lit segments, filling in discrete
  quantized steps rather than a smooth gradient or diagonal texture.
  Same `HazardBar.svelte`/`progress` prop and triple-duty role
  (readiness/playback progress/lyric-timing) as `riot`'s version — only
  the rendered device changes per theme, per this artifact's existing
  "components don't branch on theme, only values/classes do" rule (the
  component picks the class from `data-theme`, same mechanism
  `.signature-glitch`/`.signature-tape` already used).
- **Motion**: the glitch/chromatic-aberration fringe (`.signature-glitch`)
  plus the CRT scanline (below), in **both** modes — `cyberpunk`'s whole
  identity is digital, so there's no light-mode exception the way `riot`
  has one signature motion (tape-peel) shared across both of its modes.
  Symmetric with `riot`: each theme has exactly one signature motion,
  used in both its modes, and the two themes never share one.
- **Type flourish**: a subtle RGB-split text-shadow duplicate
  (`.glitch-text`, red/cyan channel offset) on hero/title type
  (`--font-display` moments — logotype, big state words) only under this
  theme — no new font, just a cheap layered `text-shadow` reinforcing the
  glitch identity where type is most prominent. `riot` has no equivalent;
  its type stays clean/undistorted, consistent with its physical (not
  screen-based) identity.

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

Additionally adds `sync-scroll`'s CRT scanline overlay (a `body::after`
repeating-linear-gradient texture), gated the same way, alongside the
glitch fringe — both run in both `cyberpunk` modes, per the Motion
bullet above.

## Lyrics Gap Indicator (2026-07-06)

The full-lyrics sheet's gap-timing indicator (ui.md) reuses each theme's
own established visual language for its drain bar — a genuinely
**separate element** from the persistent Bar's `HazardBar`
readiness/progress device (`--hazard-fill`, `.hazard-stripes`/
`.led-marquee`), not a second instance of it, since this bar tracks a
different signal (time remaining in a lyric gap, not overall
session/playback progress):

- **`riot`**: a hazard-tape-styled drain — the same diagonal-stripe
  visual language as `.hazard-stripes`, `--hazard`-colored, but its own
  element/class, draining (shrinking) rather than filling as the gap
  elapses.
- **`cyberpunk`**: an LED-marquee-styled drain — the same segmented,
  hard-edged block language as `.led-marquee`, `--hazard`-colored, same
  drain-not-fill direction.

The four countdown dots reuse the existing active/base lyric-text color
roles (the same convention the lyric-line highlight already uses,
`--lyric-active`/`--lyric-base`) — no new color role, just the existing
"what's active right now" meaning applied to a dot instead of a line.

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

Motion is theme-scoped, not mode-scoped — see UI Chrome Redesign's
Motion section for `riot` (tape-peel, both modes) and Themes' Cyberpunk
section for `cyberpunk` (glitch fringe + CRT scanline + RGB-split title
text, both modes). Each theme has exactly one signature motion identity,
expressed identically in both its light and dark variants; the two
themes never share a motion device. Animated progress/readiness fill
(`.hazard-stripes` for `riot`, `.led-marquee` for `cyberpunk`) carries
per-participant readiness, playback progress, and lyric-timing
highlight in both themes — one device per theme, three jobs each.

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
