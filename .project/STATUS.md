# sync-tab-scroll — Project Status

_Updated: 2026-07-01. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | stable ✅ | 0 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

None.

## Cross-Artifact Issues

None. brand.md and infrastructure.md were both corrected this session to
remove a disproven claim (that alphaTab's SVG output could be CSS-targeted
per glyph type for a 3-way color split) and now consistently describe the
flattened `mainGlyphColor` design plus the upstream alphaTab feature
request filed to potentially restore finer-grained theming later.

## Within-Artifact Issues

None.

## Constitution Compliance

No violations.

## Diagrams

- datamodel.md — up to date ✅
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure` — content changed this session, structure likely unaffected but not yet re-rendered)
- ui.md — up to date ✅

## Implementation Status

Plan `plan-live-rendering-pivot-2026-07-01.md` is approved, on branch
`live-rendering-pivot`. Tasks file `tasks-live-rendering-pivot-d9c2.md` is
`in-progress`: **17/27 tasks complete** (Phases 1-4 done — scaffolding,
lyrics pipeline, server protocol, client alphaTab rendering in dark mode,
all verified against real fixtures/browser). Phase 5 (Playback Sync,
T018-T020) is next.

A background research agent is investigating whether alphaTab's `html5`
(canvas) render engine would help/hurt/not-affect the glyph-theming
limitation found in Phase 4 — not yet reported back as of this analysis.

## Recommended Next Step

`/ardd-render infrastructure` to refresh its diagram, then continue
`/ardd-implement` with Phase 5 (T018-T020: client-side drift correction,
headless alphaTab for lyrics-part participants, metronome/count-in
wiring).
