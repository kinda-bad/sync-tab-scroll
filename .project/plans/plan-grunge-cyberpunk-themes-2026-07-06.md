---
status: approved
branch: grunge-cyberpunk-themes
created: 2026-07-06
features: [grunge-cyberpunk-themes]
surfaced-defects: [86b6d372, 744f8882, b5f9697c, 3b0d8e26, 5a3efbf9, 3c1509ab]
---

# Plan: Riot rework + Cyberpunk theme

## Goal

Rework the app's existing default theme into a louder, wilder "riot"
identity (Yeah Yeah Yeahs/Nirvana-inspired), and add a fully distinct
second theme, "cyberpunk" (harvested from the predecessor `sync-scroll`
project's palette), each selectable independently of the existing
light/dark toggle.

## Scope

**In scope:**
- Rework `client/src/styles/tokens.css`'s existing `[data-theme='dark']`
  and `[data-theme='light']` blocks to the new `riot` palette values
  (`brand.md`'s UI Chrome Redesign section, already updated).
- Add two new blocks, `[data-theme='cyberpunk-dark']` and
  `[data-theme='cyberpunk-light']`, per `brand.md`'s new Themes section.
- Add the CRT-scanline motion motif, scoped to both cyberpunk values.
- Update `client/src/brand-colors.ts` (tab-notation color tables) and
  `client/src/tab-renderer.ts`'s `Theme` type to cover all four flat
  theme values.
- Redesign the Preferences tab's single dark/light toggle into two
  orthogonal controls: a theme-family picker (`riot`/`cyberpunk`) and the
  existing light/dark toggle, per `ui.md`'s updated Preferences bullet.
  `client/src/theme.ts` widens `StorageTheme`/`applyTheme` accordingly.
- Add `cyberpunk-dark`/`cyberpunk-light` entries to
  `client/.storybook/preview.ts`'s `withThemeByDataAttribute` config
  (already anticipated by its own comment).
- Live-verify all four theme values in a real browser (this project's
  `browser-verify-alphatab-quirks` practice — CSS layout/rendering can't
  be observed by Playwright/vitest alone for visual review, though CT
  screenshots can still catch regressions).

**Out of scope:**
- Any third theme, or keeping the original (pre-rework) theme values
  available as a separate selectable option — `riot` replaces the
  original theme's values in place, per user decision; the original
  values aren't preserved anywhere.
- The 5 unrelated `DEFECTS.md` findings surfaced during this planning
  pass (percussion-detection wording, render-scaling doc gap,
  host-remove-participant UI, lrclib wording, CI-provider gap) — user
  declined to fold any into this plan; 4 of 5 are already closed by the
  (pending-merge) `defects-followup` branch, and the 5th is a separate
  tracked decision. Recorded in this plan's `surfaced-defects:` so they
  aren't re-prompted by a future `/ardd-plan` run.
- Per-theme typography — both themes keep the existing
  `--font-display: Bungee` / `--font-mono: IBM Plex Mono` pair; adding a
  third per-theme font dimension would be new architecture (fonts are
  currently global, not `[data-theme]`-scoped) with no clear need from
  either reference source.

## Technical Approach

**Data model**: `Theme` (`client/src/tab-renderer.ts`) widens from
`'dark' | 'light'` to `'dark' | 'light' | 'cyberpunk-dark' |
'cyberpunk-light'` — a flat 4-value union, not a themeFamily×mode pair at
the type level (mirrors the existing 2-value precedent exactly, just two
more literals). `client/src/theme.ts`'s `StorageTheme` type and
`STORAGE_KEY` persistence follow the same widening; `loadStoredTheme`'s
validation switches from a 2-way to a 4-way check.

**UI**: the Preferences tab computes the flat value from its two
controls (theme-family picker × light/dark toggle) and calls the existing
`applyTheme()` unchanged — `applyTheme` doesn't need to know two controls
produced its input. Reading the *current* flat value back into the two
controls on mount: derive theme-family from whether the stored value
starts with `cyberpunk-`, and mode from whether it ends in `-dark`/is
`'dark'` vs. `-light`/`'light'`.

**Tokens/CSS**: two new `[data-theme='cyberpunk-*']` blocks in
`tokens.css`, values per `brand.md`'s Themes section. The existing
`.signature-glitch` motif needs no code changes — it already recolors to
`--riot`/`--hazard`, and those are now a genuine pink/cyan pair under
`cyberpunk-dark`, producing the literal two-channel split described in
`brand.md`. Add a new CRT-scanline rule (a `body::after`
repeating-linear-gradient, adapted from `sync-scroll/client/src/styles/
main.css`), gated to both cyberpunk values only — same
per-theme-motion-variant pattern the Motion section already documents for
`riot` dark/light (glitch vs. tape-peel), now a third variant.

**Tab notation**: `client/src/brand-colors.ts` gets two new exported
color tables (`cyberpunkDarkTabColors` — reused verbatim from the
existing `darkTabColors` values, since `brand.md` says `cyberpunk-dark`'s
tab palette is identical to the current dark palette; and
`cyberpunkLightTabColors`, a new fresh-pass table per `brand.md`).
`tab-renderer.ts`'s `setTheme`/`applyThemeColors` switch over all four
values.

**Storybook**: add `'cyberpunk-dark': 'cyberpunk-dark'` and
`'cyberpunk-light': 'cyberpunk-light'` to `preview.ts`'s `themes` map —
already anticipated by that file's own comment.

## Phase Breakdown

### Phase 1 — Riot rework (tokens + tab colors)
- [ ] Update `tokens.css`'s `[data-theme='dark']`/`[data-theme='light']`
  blocks to the new `riot` values (`brand.md`'s UI Chrome Redesign
  section). [artifacts: brand] [feature: grunge-cyberpunk-themes]
- [ ] Live-verify in a real browser (both modes): contrast/legibility of
  the reworked `--riot`/`--hazard`/`--ink` values against the new
  darker/warmer bases, across the Bar, cards, forms, and the
  `.hazard-stripes`/`.signature-glitch`/`.signature-tape` motifs.

### Phase 2 — Cyberpunk theme (tokens, tab colors, motion)
- [ ] Add `[data-theme='cyberpunk-dark']` and
  `[data-theme='cyberpunk-light']` blocks to `tokens.css`, per `brand.md`.
  [artifacts: brand] [feature: grunge-cyberpunk-themes] [parallel]
- [ ] Add the CRT-scanline motion rule, gated to both cyberpunk values.
  [artifacts: brand] [feature: grunge-cyberpunk-themes] [parallel]
- [ ] Add `cyberpunkDarkTabColors`/`cyberpunkLightTabColors` to
  `brand-colors.ts` and wire both into `tab-renderer.ts`'s `Theme`
  union/`setTheme`. [artifacts: brand] [feature: grunge-cyberpunk-themes]
- [ ] Live-verify in a real browser (both modes): the literal pink/cyan
  `.signature-glitch` split renders as expected, CRT scanline is visible
  but not overpowering, tab notation colors read clearly against both
  cyberpunk backgrounds.

### Phase 3 — Theme control UI
- [ ] Widen `client/src/theme.ts`'s `StorageTheme` type, `STORAGE_KEY`
  validation, and persistence to the 4-value set.
  [artifacts: ui] [feature: grunge-cyberpunk-themes]
- [ ] Redesign the Preferences tab's theme control into the two
  orthogonal pickers (theme-family + light/dark), computing the flat
  `data-theme` value and reading it back on mount, per `ui.md`.
  [artifacts: ui] [feature: grunge-cyberpunk-themes]
- [ ] Extend `SettingsModal.ct.spec.ts` (or add a new spec) covering:
  both controls render, selecting each combination produces the right
  `data-theme` value and persists across a simulated reload.
- [ ] Add `cyberpunk-dark`/`cyberpunk-light` entries to
  `.storybook/preview.ts`'s `withThemeByDataAttribute` config.

### Phase 4 — Verification
- [ ] Run the full test suite (server + client vitest, CT, e2e).
- [ ] Manually verify in a real browser: switching each control
  independently updates the palette and tab-notation colors together,
  and the choice survives a refresh.

## Complexity Tracking

None — no new principle deviations. The 4-value flat `Theme` union
mirrors the existing 2-value precedent exactly (Principle VI: still one
named type, no independently-retyped duplicates); the two-control UI
computing one stored value doesn't introduce a second source of truth
(Principle I) since only the derived flat value is ever persisted or read
by `applyTheme`.

## Open Questions

None blocking — the two real design forks (theme-family naming, and
flat-4-value vs. themeFamily×mode data model) were resolved by the user
during this planning pass: theme names are `riot`/`cyberpunk`, `riot`
reworks the original theme in place rather than coexisting with it, and
the UI exposes two orthogonal controls while the underlying stored value
stays a flat enum (matching the existing precedent).

## Production Annotation Summary

None — no production shortcuts introduced. All values in `brand.md`'s
Themes section are treated as real design decisions (dark passes
harvested/reworked from real reference sources, light passes explicitly
flagged as lower-confidence first passes needing visual refinement during
implementation — consistent with this artifact's existing convention for
non-harvested palettes, not a placeholder needing a shortcut annotation).
