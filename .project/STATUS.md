# sync-tab-scroll — Project Status

_Updated: 2026-07-02. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | stable ✅ | 0 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |
| features.md | — | 0 |

## Open Questions

None formally tracked in the artifacts.

## Cross-Artifact Issues

None found this pass.

## Within-Artifact Issues

None — no `[OPEN]` placeholders in any artifact.

## Constitution Compliance

No new violations found this pass. `DEFECTS.md`'s Principle VII entry is
now partially stale relative to code — `test-coverage-backfill` closed
most of the gap it describes (server handlers, `session-store`,
`connections`, and client pure-logic modules are now covered by vitest).
The remaining, still-accurate gap is exactly what
`plan-playwright-coverage-2026-07-02.md` targets. Not corrected here;
`/ardd-verify` owns `DEFECTS.md`.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-02 (partially
stale, see Constitution Compliance above). Run `/ardd-verify` to refresh.

## Feedback

No open feedback files.

## Feature Backlog

4 backlogged · 1 planned · 0 tasked · 1 implemented — see
`.project/artifacts/features.md`.

## Plans

- `plan-playwright-coverage-2026-07-02.md` — **approved**, not yet
  tasked. Two Playwright projects (e2e, ct) covering client's
  DOM/alphaTab/WebSocket-coupled modules; audio assertions explicitly
  out of scope.
- `plan-test-coverage-2026-07-02.md` — implemented, merged to `main`
  (vitest backfill: 21 files, 81 tests across client/server).
- `plan-lobby-cursor-modes-2026-07-03.md` — implemented and merged, except
  `T010` (manual two-tab browser verification) which remains blocked on
  a Chrome-extension typing glitch — `playwright-client-coverage`'s
  `multi-participant.spec.ts` (Phase 4) is planned to supersede the need
  for that manual step entirely.
- `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md`,
  `plan-live-rendering-pivot-2026-07-01.md` — all implemented, merged to
  `main`.

## Implementation Status

**live-rendering-pivot, song-catalog-selection, lobby-cursor-modes,
test-coverage-backfill: complete**, all merged to `main`.

**playwright-client-coverage: approved, not yet tasked.** Branch
`playwright-coverage`.

## Recommended Next Step

Run `/ardd-tasks` against `plan-playwright-coverage-2026-07-02.md` to
generate its task list, then `/ardd-implement`.
