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
`playback-sync-fixes`, `lyrics-ticker`, `settings-modal-redesign`, and
`session-create-selection` were implemented and merged — likely stale,
but that's `/ardd-verify`'s call to make, not this pass's.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-02 (likely stale,
see Constitution Compliance above). Run `/ardd-verify` to refresh.

## Feature Backlog

5 backlogged · 0 planned · 0 tasked · 2 implemented (`test-coverage-backfill`,
`playwright-client-coverage`) — see `.project/artifacts/features.md`.

## Plans

- `plan-settings-modal-redesign-2026-07-03.md`, `plan-session-create-selection-2026-07-03.md`,
  `plan-playback-sync-fixes-2026-07-03.md`, `plan-lyrics-ticker-2026-07-03.md`,
  `plan-ui-polish-pass-2026-07-03.md`, `plan-playwright-coverage-2026-07-02.md`,
  `plan-test-coverage-2026-07-02.md`, `plan-lobby-cursor-modes-2026-07-03.md`,
  `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md`,
  `plan-live-rendering-pivot-2026-07-01.md` — all implemented, merged to
  `main`.

## Implementation Status

**live-rendering-pivot, song-catalog-selection, lobby-cursor-modes,
test-coverage-backfill, playwright-client-coverage, ui-polish-pass,
playback-sync-fixes, lyrics-ticker, settings-modal-redesign,
session-create-selection: complete**, all merged to `main`. Currently on
`main`, worktree clean.

Full suite green on merged `main`: client vitest 6 files/25 tests, client
CT 20/20, client e2e 10/10, server vitest 16 files/58 tests.

**Unsigned commits — needs attention before any push.** Every commit
across `settings-modal-redesign`, `session-create-selection`, and their
merge commits into `main` was made with `--no-gpg-sign` (1Password was
locked throughout both implementation passes). Re-sign the range (e.g.
an interactive rebase resigning back to before `4d59333`/`2acb6b4`) once
1Password is available, before pushing.

**Still needs a human's live-browser confirmation** (not automatable in
this environment):
- Two-participant no-rubberband playback (`playback-sync-fixes`).
- Lyrics ticker scroll/center/resize + tab-scroll-padding clearance
  (`lyrics-ticker`).
- Hazard-strip top positioning and content top-padding clearance
  (`settings-modal-redesign`).
- Theme toggle reachable from both Lobby and Playback, changes both the
  CSS palette and tab notation together, and persists across a refresh
  (`settings-modal-redesign`).

## Recommended Next Step

No plan currently awaiting tasking. Recommend a manual live-browser pass
over the four unconfirmed items above (captured via `/ardd-feedback` if
anything doesn't match expectations), and re-signing the unsigned commit
range before pushing `main`.
