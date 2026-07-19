---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: icons-a11y-ticker
created: 2026-07-19
features: [lyrics-ticker-position-preference]
surfaced-defects: []
---

# Plan: Icon refresh, accessibility audit, and ticker position/size

## Goal

Refresh the app's icon language (bone-fracture leave, log-out/log-in for
account actions, crown host badge, settings icon), fix the tooltip
z-index bug, make every icon screen-reader accessible, make the lyrics
toggle always-visible-but-disabled, and ship the ticker position
preference plus bigger desktop font sizes.

## Scope

**In** (all from `feedback-icon-refresh-a11y-39d8.md` + feature
`lyrics-ticker-position-preference`):
- F005 (bug): Bar tooltips render under the alphaTab view — fix the
  stacking (z-index above the tab surface, or portal out of the Bar's
  stacking context); verify against the lyrics overlay's layering too.
- F001: Leave session → bone-fracture icon (lucide `bone` or closest
  fracture-styled variant; "breaking up the band"); `log-out` → Sign
  out; `log-in` → Sign in.
- F002: HOST text badge → crown icon.
- F004: Settings control `cog` → `settings`.
- F003: accessibility audit — aria-labels on every icon-only control
  (tooltips complement, never substitute); decorative/status icons
  (crown) get accessible text or aria-hidden + adjacent text; verified
  across Bar, settings modal, part picker, participant list, account
  menu.
- F006 (confirmed reversal): the Bar's "Toggle lyrics" control becomes
  always visible, disabled with a tooltip/aria reason when no ticker is
  available (no lyrics track, or Lyrics part) — reversing ui.md's
  "absent entirely" decision; ui.md revision task.
- F007: ticker font-size steps scale up substantially on desktop
  viewports (responsive step values; small screens roughly unchanged).
- `lyrics-ticker-position-preference` (ui.md updated this run):
  personal Preferences toggle, ticker at top or bottom of viewport,
  default bottom.

**Out:**
- Any new icons beyond those named; no icon for Solo (user decision,
  recorded in the settings-ux plan).
- The remaining backlog (`explicit-participant-readiness`,
  `sync-tabs-to-real-audio`, `host-mandated-bars-per-row-layout`).

## Technical Approach

All client-side. The a11y work (F003) is the umbrella: do it as a
sweep *after* the icon swaps so it audits the final icon set. Icon
swaps (F001/F002/F004) are mechanical lucide changes at the existing
`Button` iconOnly call sites plus the participant-list badge. F005 is a
CSS/stacking fix in `Button.svelte`'s Tooltip (test by asserting
computed stacking vs the alphaTab container, plus a live check). F006
rewires the existing `!isLyricsPart` gating in the Bar to a disabled
state with reason text (tooltip + aria-disabled), with the ui.md
revision reflecting the reversal. F007 and the position preference both
live in the ticker's CSS/preference modules
(`lyrics-ticker-font-size-preference.ts` pattern for the new
`lyrics-ticker-position-preference.ts`; position applied in
`lyrics-overlay.ts`'s overlay placement, top vs bottom fixed
positioning). TDD: CT for gating/disabled states, icon presence, aria
attributes, and position/size application; live pass at the end.

## Phase Breakdown

**Phase 1 — Tooltip stacking fix (F005).** No dependencies. Bug first.

**Phase 2 — Icon swaps (F001/F002/F004).** No dependencies. Mechanical;
includes participant-list crown.

**Phase 3 — Lyrics toggle always-visible (F006) + ticker position pref
(feature) + desktop font sizes (F007).** No dependencies between each
other; grouped as the ticker/Bar behavior phase. ui.md revision for
F006's reversal.

**Phase 4 — Accessibility sweep (F003).** Depends on 1–3 (audits the
final surface). aria-labels everywhere, CT assertions, screen-reader
spot check notes.

**Phase 5 — Live verification + close-out.** Depends on 1–4.

## Open Questions

1. Lucide has `bone` but no literal "bone-fracture" — if no
  fracture-styled variant exists, is plain `bone` acceptable, or
  compose a small custom SVG in lucide's stroke style? Default: plain
  `bone`.
2. Desktop font-size scaling: media-query breakpoint (~1024px) with
  roughly 1.5–2× step values — exact values are implementation-time
  visual judgment; flag in the live check for user eyeballing.
