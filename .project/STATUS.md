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

No new violations found this pass. `DEFECTS.md`'s Principle VII entry has
not been re-verified since `test-coverage-backfill` and
`playwright-client-coverage` were implemented and merged — likely stale,
but that's `/ardd-verify`'s call to make, not this pass's.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-02 (likely stale,
see Constitution Compliance above). Run `/ardd-verify` to refresh.

## Feedback

No open feedback files on this branch (`playback-sync-fixes`). All 3
present here are `status: planned`: `feedback-lobby-cursor-mode-e13b.md`,
`feedback-playback-sync-f03d.md`, `feedback-ui-polish-pass-e180.md`.

Note: `feedback-lyrics-ticker-bfd9.md` exists only on the separate,
unmerged `lyrics-ticker` branch — not visible from here, which is expected
branch scoping, not a gap.

## Feature Backlog

5 backlogged · 0 planned · 0 tasked · 2 implemented (`test-coverage-backfill`,
`playwright-client-coverage`) — see `.project/artifacts/features.md`.

## Plans

- `plan-playback-sync-fixes-2026-07-03.md` — **approved**, not yet tasked.
  Branch `playback-sync-fixes` (current). Fixes the playback-rubberband
  bug via host-authoritative `tickPosition` reporting, and makes the
  session join code always visible in the persistent bar.
- `plan-lyrics-ticker-2026-07-03.md` — **approved**, not yet tasked. Lives
  on the separate `lyrics-ticker` branch, not visible from here. Redesigns
  the in-tab lyrics overlay as a single-line, snap-to-active-syllable,
  bottom-pinned scrolling ticker.
- `plan-ui-polish-pass-2026-07-03.md`,
  `plan-playwright-coverage-2026-07-02.md`,
  `plan-test-coverage-2026-07-02.md`,
  `plan-lobby-cursor-modes-2026-07-03.md`,
  `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md`,
  `plan-live-rendering-pivot-2026-07-01.md` — all implemented, merged to
  `main`.

## Implementation Status

**live-rendering-pivot, song-catalog-selection, lobby-cursor-modes,
test-coverage-backfill, playwright-client-coverage, ui-polish-pass:
complete**, all merged to `main`.

**playback-sync-fixes: approved, not yet tasked.** Branch
`playback-sync-fixes` (current).

**lyrics-ticker: approved, not yet tasked.** Branch `lyrics-ticker`
(separate, unmerged).

## Recommended Next Step

Run `/ardd-tasks` against `plan-playback-sync-fixes-2026-07-03.md` to
generate its task list, then `/ardd-implement`.
