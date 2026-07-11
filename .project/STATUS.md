# sync-tab-scroll — Project Status

_Updated: 2026-07-11 (`/ardd-analyze` after `/ardd-implement` completed
`tasks-catalog-loader-dotfile-guard-b891.md` (5/5) and merged it into `main`.
The AppleDouble tab bug is fixed, deployed, and live-verified. All six
artifacts `stable`; nothing in flight.)_

ARDD update available: installed `9189817`, source at `7883e7c` — run
`/ardd-update`.

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

None — all six artifacts are `stable` with no `[OPEN:` markers.

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state and `datamodel.md`'s
  `Participant.connectionStatus` field share a name but describe different
  concepts. Worth disambiguating later.
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (`client/src/playback-sync.ts`). An omission, not a contradiction.
- [MINOR] The feature register's pre-convention "Metronome toggle"/
  "Count-in toggle" entries carry superseded logging-time descriptions.

## Within-Artifact Issues

None.

## Constitution Compliance

No violations found this pass.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅ (2026-07-11 Song Catalog Delivery note on the
  dotfile/AppleDouble skip is prose; layout unchanged)
- ui.md — current ✅

## Code-vs-Artifact Defects

**0 known defects** — `DEFECTS.md` all-clear, last checked 2026-07-10.
`infrastructure.md`'s Song Catalog Delivery now documents the loader's
dotfile skip and `catalog-loader.ts` enforces it, so code and artifact agree;
a `/ardd-verify` pass could re-baseline `DEFECTS.md`'s date to confirm.

## Feedback

No open feedback — `feedback-deployed-tab-loading-dc21.md` is `planned`,
consumed by `plan-catalog-loader-dotfile-guard-2026-07-11.md`, and its fix
(F001/F002) is merged and live-verified.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 14 implemented — see
`.project/features/`.

## In Flight

Nothing in flight — no sibling worktrees, no draft PRs, no draft plans, no
open feedback. `main` is **1 commit ahead of `origin/main`** (the tasks
completion + this STATUS bookkeeping — the code fix itself is already pushed
in merge `f488783` and deployed). The merged local branch
`catalog-loader-dotfile-guard` can be deleted at leisure.

The Railway deployment at https://sync-tab-scroll.up.railway.app is live and
functional: catalog volume populated (public `default` catalogue + private
key-gated `kinda-bad` pack), and the dotfile fix is deployed — all 6 songs
now resolve to their real `.gp`, so tabs render and playback starts.

## Recommended Next Step

Optional cleanup: push the remaining bookkeeping commits to `origin/main`
and delete the merged `catalog-loader-dotfile-guard` branch. Optionally run
`/ardd-verify` to re-baseline `DEFECTS.md` now that the loader/artifact are
aligned. Otherwise the deployment is complete and healthy.
