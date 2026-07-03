# sync-tab-scroll — Project Status

_Updated: 2026-07-03. Keep this current as artifacts are refined and open questions are resolved._

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
now likely fully stale — `playwright-client-coverage`'s implementation
closed the remaining DOM/alphaTab/WebSocket-coupled test-coverage gap it
described, on top of `test-coverage-backfill`'s earlier work. Not
corrected here; `/ardd-verify` owns `DEFECTS.md`.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-02 (likely fully
stale, see Constitution Compliance above). Run `/ardd-verify` to refresh.

## Feedback

No open feedback files. `feedback-ui-polish-pass-e180.md` was consumed
by `plan-ui-polish-pass-2026-07-03.md` (5 items incorporated, 1
hazard-stripe-removal item declined by the user) and is now
`status: planned`.

## Feature Backlog

5 backlogged · 0 planned · 0 tasked · 2 implemented — see
`.project/artifacts/features.md`.

## Plans

- `plan-ui-polish-pass-2026-07-03.md` — **approved**, not yet tasked.
  Fixes playback cursor visibility, click-to-seek, and lyrics-overlay
  placement; bar dark-mode contrast; song/part-selection modal.
- `plan-playwright-coverage-2026-07-02.md`,
  `plan-test-coverage-2026-07-02.md`,
  `plan-lobby-cursor-modes-2026-07-03.md`,
  `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md`,
  `plan-live-rendering-pivot-2026-07-01.md` — all implemented, merged to
  `main`.

## Implementation Status

**live-rendering-pivot, song-catalog-selection, lobby-cursor-modes,
test-coverage-backfill, playwright-client-coverage: complete**, all
merged to `main`.

**ui-polish-pass: approved, not yet tasked.** Branch `ui-polish-pass`.

## Recommended Next Step

Run `/ardd-tasks` against `plan-ui-polish-pass-2026-07-03.md` to
generate its task list, then `/ardd-implement`.
