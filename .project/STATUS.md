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
not been re-verified since `test-coverage-backfill`, `playwright-client-coverage`,
`playback-sync-fixes`, and `lyrics-ticker` were implemented and merged —
likely stale, but that's `/ardd-verify`'s call to make, not this pass's.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-02 (likely stale,
see Constitution Compliance above). Run `/ardd-verify` to refresh.

## Feedback

1 open feedback file — `feedback-settings-modal-redesign-7e73.md` (on the
current branch, `settings-modal-redesign`): a cog-opened settings modal
(Participants/Settings tabs), "Start" closing all open modals without
affecting the lyrics overlay, and moving the hazard-tape bar to the top
of the view. Will be picked up by the next `/ardd-plan`.

## Feature Backlog

5 backlogged · 0 planned · 0 tasked · 2 implemented (`test-coverage-backfill`,
`playwright-client-coverage`) — see `.project/artifacts/features.md`.

## Plans

- `plan-playback-sync-fixes-2026-07-03.md`, `plan-lyrics-ticker-2026-07-03.md`,
  `plan-ui-polish-pass-2026-07-03.md`, `plan-playwright-coverage-2026-07-02.md`,
  `plan-test-coverage-2026-07-02.md`, `plan-lobby-cursor-modes-2026-07-03.md`,
  `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md`,
  `plan-live-rendering-pivot-2026-07-01.md` — all implemented, merged to
  `main`.
- No plan yet exists for the open `settings-modal-redesign` feedback.

## Implementation Status

**live-rendering-pivot, song-catalog-selection, lobby-cursor-modes,
test-coverage-backfill, playwright-client-coverage, ui-polish-pass,
playback-sync-fixes, lyrics-ticker: complete**, all merged to `main`.

Two items from `playback-sync-fixes`/`lyrics-ticker` still await a human's
live-browser confirmation (not automatable in this environment): the
two-participant no-rubberband playback check, and the lyrics ticker's
scroll/center/resize behavior plus tab-scroll-padding clearance.

**settings-modal-redesign: feedback captured, not yet planned.** Current
branch `settings-modal-redesign` (renamed from the now-merged
`playback-sync-fixes`, which was rebased onto `main` and is otherwise
identical to it).

## Recommended Next Step

Run `/ardd-plan` to draft a plan from `feedback-settings-modal-redesign-7e73.md`
(the cog/tabbed-settings-modal, Start-closes-modals, and hazard-bar-position
items).
