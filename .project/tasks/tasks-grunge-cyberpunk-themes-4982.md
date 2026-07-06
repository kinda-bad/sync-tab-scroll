---
plan: plan-grunge-cyberpunk-themes-2026-07-06.md
generated: 2026-07-06
status: in-progress
---

# Tasks

## Phase 1: Riot rework (tokens + tab colors)
- [x] T001 [artifacts: brand] Update `client/src/styles/tokens.css`'s
  `[data-theme='dark']` block to the reworked "riot" dark values from
  `brand.md`'s UI Chrome Redesign section: `--bg: #050403`,
  `--surface: #150e10`, `--bar-surface: #2b1018`, `--ink: #f3e6c8`,
  `--riot: #ff0857`, `--hazard: #ffb400`. (feature:
  grunge-cyberpunk-themes)
- [x] T002 [artifacts: brand] [parallel] Update `tokens.css`'s
  `[data-theme='light']` block to the reworked "riot" light values:
  `--bg: #ece0b8`, `--surface: #ddcb92`, `--bar-surface: #c2a35c`,
  `--ink: #160f0c`, `--riot: #9c0f3a`, `--hazard: #8a5200`. (feature:
  grunge-cyberpunk-themes)
- [x] T003 Live-verify in a real browser (this project's
  `browser-verify-alphatab-quirks` practice — Playwright/vitest can't
  fully substitute for visual review), both dark and light: contrast and
  legibility of the reworked values against the Bar, cards, and forms,
  and that `.hazard-stripes`/`.signature-glitch`/`.signature-tape` still
  read correctly with the new `--riot`/`--hazard` values. This is the
  test for T001/T002 — a palette-value change with no scripted
  equivalent, same pattern as the prior `lyrics-ticker-font-size` plan's
  live-verify task.

  Verified via a throwaway Playwright CT spec (real Chromium, `BarHarness`
  mounting `Bar.svelte` — exercises `.torn-edge`/`.hazard-stripes`/
  `.signature-glitch`/`.signature-tape` together), not committed: measured
  WCAG contrast ratio of `--ink` against `--bg`/`--surface`/`--bar-surface`
  in both modes (all > 4.5:1 — dark: ink `#f3e6c8` vs bg `#050403` ≈ 16.5:1,
  vs bar-surface `#2b1018` ≈ 12.7:1; light: ink `#160f0c` vs bg `#ece0b8` ≈
  15.8:1, vs bar-surface `#c2a35c` ≈ 8.0:1) and captured full-page
  screenshots of both. Dark: near-black canvas, blood-magenta torn-edge bar,
  marigold hazard stripe, cream text — all legible. Light: cracked-parchment
  tan canvas, warm ochre bar, dark ink text, brown/tan hazard stripe — all
  legible. No contrast/legibility regressions found; no code changes
  needed. Not a substitute for a human eyeball pass on the actual app
  (cards/forms weren't in this harness — only the Bar/motifs — since
  `--surface`/`--ink` contrast was already checked directly via computed
  tokens above), flagged for T016's final manual pass.

## Phase 2: Cyberpunk theme (tokens, tab colors, motion)
- [x] T004 [artifacts: brand] [parallel] Add a new
  `[data-theme='cyberpunk-dark']` block to `tokens.css`: `--bg: #08080c`,
  `--surface: #111118`, `--bar-surface: #1c1c26`, `--ink: #e8f6ff`,
  `--riot: #ff2d78`, `--hazard: #00cfff` (harvested from
  `sync-scroll/client/src/styles/main.css`, per `brand.md`'s Themes
  section). (feature: grunge-cyberpunk-themes)
- [x] T005 [artifacts: brand] [parallel] Add a new
  `[data-theme='cyberpunk-light']` block to `tokens.css`: `--bg: #eef3f7`,
  `--surface: #dbe7ee`, `--bar-surface: #c3d6e0`, `--ink: #0c1420`,
  `--riot: #d6006b`, `--hazard: #0090b8`. (feature:
  grunge-cyberpunk-themes)
- [x] T006 [artifacts: brand] Add the CRT-scanline motion rule (a
  `body::after` repeating-linear-gradient texture, adapted from
  `sync-scroll/client/src/styles/main.css`'s scanline overlay), gated to
  `[data-theme='cyberpunk-dark'], [data-theme='cyberpunk-light']` only —
  no code changes needed for the existing `.signature-glitch` motif
  itself, since it already recolors to `--riot`/`--hazard` and those are
  now a genuine pink/cyan pair under `cyberpunk-dark`. Respect
  `prefers-reduced-motion`, consistent with the existing dark/light
  motion variants. (feature: grunge-cyberpunk-themes)
- [x] T007 [artifacts: brand] Add `cyberpunkDarkTabColors` (reuse the
  existing `darkTabColors` values verbatim — `brand.md` states
  `cyberpunk-dark`'s tab palette is identical to the current dark
  palette) and `cyberpunkLightTabColors` (new fresh-pass values per
  `brand.md`'s Themes section: foreground `#00b7dd`, foregroundDim
  `rgba(0,183,221,0.40)`, rulingDim `rgba(214,0,107,0.35)`, rulingMid
  `rgba(214,0,107,0.50)`) to `client/src/brand-colors.ts`. (feature:
  grunge-cyberpunk-themes)
- [x] T008 [artifacts: brand] Widen `client/src/tab-renderer.ts`'s
  `Theme` type from `'dark' | 'light'` to `'dark' | 'light' |
  'cyberpunk-dark' | 'cyberpunk-light'`, and extend
  `applyThemeColors`/`setTheme` to switch over all four values, per
  `brand.md`'s Tab Notation tables: `cyberpunk-dark` reuses the existing
  dark-mode cursor/lyric colors verbatim (`#ff2d78` cursor/active
  syllable, neon-yellow base lyric text); `cyberpunk-light` uses
  `#d6006b` for cursor/active syllable and `#00647d` for base lyric text
  (matching T007's `cyberpunkLightTabColors`). (feature:
  grunge-cyberpunk-themes)

  Note: cursor/active-syllable/base-lyric-text colors are CSS-driven
  (`--lyric-active`/`--lyric-base` in tokens.css, aliased to
  `--riot`/`--hazard` per theme, consumed by `motifs.css`'s
  `.at-cursor-bar`/`.at-cursor-beat`/`.at-selection` and `lyrics.css`) —
  already correct for both cyberpunk themes from T004/T005's token values
  with no `tab-renderer.ts` code needed; this task's actual code changes
  are the `Theme` union widening and `applyThemeColors`'s 4-way color-table
  switch (`mainGlyphColor`/`secondaryGlyphColor`/`staffLineColor`/
  `barSeparatorColor`/`barNumberColor`/`scoreInfoColor`). Also fixed
  `playback-engine.ts`'s `ensurePlaybackEngine`, which read
  `document.documentElement.dataset.theme` into a `Theme` via a
  light-or-dark-only ternary — a fresh tab engine created under either
  cyberpunk theme would've silently rendered with dark-mode tab colors
  otherwise. Not separately listed in this task's file-by-file description
  but necessary for the `Theme` widening to actually take effect end to
  end.
- [x] T009 Live-verify in a real browser, both cyberpunk modes: the
  literal pink/cyan `.signature-glitch` two-channel split renders as
  expected, the CRT scanline is visible but not overpowering (and
  respects `prefers-reduced-motion` when toggled), and tab notation
  colors read clearly against both cyberpunk backgrounds. This is the
  test for T004-T008 — a palette/motion addition with no scripted
  equivalent for visual review.

  Verified via a throwaway Playwright CT spec (real Chromium), not
  committed: `BarHarness` (mounts `Bar.svelte`, exercising
  `.signature-glitch`/CRT scanline together) and `TabRendererHarness`
  (real alphaTab SVG render against the `synthetic-song.gp` fixture, same
  fixture `tab-renderer.ct.spec.ts` uses). Confirmed `--riot`/`--hazard`
  are a genuine pink/cyan pair in both cyberpunk modes (dark: `#ff2d78`/
  `#00cfff`; light: `#d6006b`/`#0090b8`), `body::after`'s scanline rule is
  present (`content: ""`) under both `cyberpunk-dark` and
  `cyberpunk-light`, and — confirmed via full-page screenshots — the
  scanline reads as a subtle, non-overpowering horizontal-line texture
  (clearly visible against the light background, subtler against the near-
  black dark background). Also confirmed the scanline still renders under
  `page.emulateMedia({reducedMotion: 'reduce'})` — expected and correct,
  since it's a static texture with no animation to gate (see T006's note).
  Real alphaTab SVG render confirmed tab-notation glyph fill colors:
  `cyberpunk-dark` renders `rgb(255, 230, 0)` (neon-yellow, identical to
  `darkTabColors`, per T007); `cyberpunk-light` renders `rgb(0, 183, 221)`
  (deep cyan, per `cyberpunkLightTabColors`) with magenta staff/barlines —
  both screenshotted and legible against their respective backgrounds. Not
  a substitute for a human eyeball pass on the actual running app, flagged
  for T016's final manual pass.

## Phase 3: Theme control UI
- [x] T010 [artifacts: ui] Widen `client/src/theme.ts`'s `StoredTheme`
  type (currently `Theme` re-exported, `'dark' | 'light'`) to the
  4-value set, and update `loadStoredTheme`'s validation from a 2-way to
  a 4-way check against `localStorage`. (feature: grunge-cyberpunk-themes)

  `StoredTheme` is `= Theme` (re-exported, not redeclared — Principle VI),
  so it was already widened by T008's `Theme` union change; the only
  actual code change here is `loadStoredTheme`'s 2-way to 4-way
  `localStorage` value check. `theme.test.ts` (T011) now passes 6/6.
- [x] T011 [artifacts: ui] Add a unit test (per constitution Principle
  VII, test-first): `loadStoredTheme` returns `undefined` for any value
  outside the 4-value set, and returns each of the 4 valid values
  correctly when present in `localStorage`. Write and confirm it fails
  against the current 2-value implementation before T010 lands, then
  confirm it passes after.

  Added `client/src/theme.test.ts` (plain vitest, same fake-localStorage
  pattern as `metronome-preference.test.ts`/`session-persistence.test.ts`
  — no jsdom/browser coupling needed for pure localStorage logic).
  Confirmed failing against the current 2-value `loadStoredTheme`: 2 of 6
  cases failed (`cyberpunk-dark`/`cyberpunk-light` both returned
  `undefined` instead of the stored value); the `dark`/`light`/no-value/
  garbage-value cases already passed, as expected. T010 implements the
  4-way check next.
- [ ] T012 [artifacts: ui] Redesign the Preferences tab's single
  dark/light toggle in `SettingsModal.svelte` into two orthogonal
  controls per `ui.md`: a theme-family picker (`riot`/`cyberpunk`) and
  the existing light/dark toggle. Compute the flat `data-theme` value
  from both controls' state and call the existing `applyTheme()`
  unchanged. On mount, derive each control's initial state from the
  stored flat value (theme-family: whether it starts with `cyberpunk-`;
  mode: whether it is/starts-with `dark` vs. `light`). (feature:
  grunge-cyberpunk-themes)
- [ ] T013 [artifacts: ui] Extend `SettingsModal.ct.spec.ts` (test-first,
  per constitution Principle VII): both controls render in the
  Preferences tab; selecting each of the 4 combinations produces the
  correct `data-theme` attribute value on `document.documentElement` and
  persists it via `theme.ts`'s storage key across a simulated reload.
  Write and confirm these fail against the current single-toggle
  implementation before T012, then confirm they pass after.
- [ ] T014 [artifacts: ui] [parallel] Add `'cyberpunk-dark':
  'cyberpunk-dark'` and `'cyberpunk-light': 'cyberpunk-light'` entries to
  `client/.storybook/preview.ts`'s `withThemeByDataAttribute` `themes`
  map, per that file's own comment anticipating this exact addition.
  (feature: grunge-cyberpunk-themes)

## Phase 4: Verification
- [ ] T015 Run the full test suite (server + client vitest, CT, e2e).
- [ ] T016 Manually verify in a real browser: switching the theme-family
  picker and the light/dark toggle each independently updates the CSS
  palette and tab-notation colors together, and the resulting flat value
  survives a page refresh.
