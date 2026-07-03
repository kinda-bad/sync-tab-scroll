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

No violations found in the last full `/ardd-verify` re-survey. Principle I
(single client store), Principle IV (handler routing), and Principle VI
(production annotations) all spot-checked clean against current code.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

5 known defects — see `DEFECTS.md`, last checked 2026-07-03. All 5 have
since had corrective `/ardd-refine` passes applied to `ui.md`, `brand.md`,
and `datamodel.md` — but `DEFECTS.md` itself is `/ardd-verify`'s sole
write surface, so its defect list won't reflect these fixes until the
next `/ardd-verify` run confirms them against code.

## Feature Backlog

5 backlogged · 0 planned · 0 tasked · 2 implemented (`test-coverage-backfill`,
`playwright-client-coverage`) — see `.project/artifacts/features.md`.

## Plans

- `plan-hazard-bar-progress-2026-07-03.md` — **approved**, tasked (7
  tasks, 3 phases). Branch `hazard-bar-progress` (current worktree).
  Replaces the Playback view's hardcoded hazard-strip fill (`1`, "live")
  with real song-position tracking via alphaTab's `playerPositionChanged`.
- `plan-theme-persistence-2026-07-03.md` — **implemented**, not yet
  merged to `main`. Lives on the separate `theme-persistence` worktree/
  branch. Fixes a fresh playback engine always hardcoding its theme to
  `'dark'` instead of reading the persisted/current value.
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
session-create-selection: complete**, all merged to `main`.

**theme-persistence: implemented** (5/5 tasks, full suite green — client
vitest 6/25, CT 8 files/21 tests, e2e 4 files/10 tests), on its own
worktree/branch, not yet merged to `main`.

**hazard-bar-progress: approved and tasked, not yet implemented.** Branch
`hazard-bar-progress` (current worktree).

**Unsigned commits — needs attention before any push.** Every commit
across `settings-modal-redesign`, `session-create-selection`,
`theme-persistence`, their merge commits, and every `/ardd-verify`/refine/
plan pass since was made with `--no-gpg-sign` (1Password locked
throughout this whole session). Re-sign the full range once 1Password is
available, before pushing anything.

**Live-browser verification status:**
- ✅ Confirmed working: Landing chooser/split-forms, 4-char join code,
  hazard strip's independent top-pinned position, content padding
  clearance, Lobby-body hint states, Settings modal reachable from both
  Lobby and Playback, theme toggle changing CSS palette + tab notation
  together, lyrics ticker's static single-line layout.
- ✅ `theme-persistence`'s fix addresses the one bug that live pass found
  (tab notation not picking up the persisted theme on a fresh load).
- ❌ Still **not verifiable in this environment** (confirmed by direct
  pixel-position measurement, not assumption): the playback cursor never
  advances at all under Chrome browser automation — audio decode never
  resolves, so alphaTab's player clock never starts. Blocks verifying the
  two-participant no-rubberband playback fix (`playback-sync-fixes`) and
  the lyrics ticker's live scroll/centering (`lyrics-ticker`). Also
  relevant to `hazard-bar-progress`'s own Phase 2 — worth attempting
  anyway since `playerPositionChanged` may fire from alphaTab's internal
  transport clock independent of real audio output, but not guaranteed.

## Recommended Next Step

Run `/ardd-implement` against `tasks-hazard-bar-progress-9622.md`. Once
implemented, merge `theme-persistence` and `hazard-bar-progress` to
`main` together with an `/ardd-analyze` pass. Separately: a human still
needs to manually verify the two-participant playback and lyrics-ticker
scroll/centering behavior in a real browser, and the unsigned commit
range needs re-signing before anything is pushed.
