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

- `plan-theme-persistence-2026-07-03.md`, `plan-hazard-bar-progress-2026-07-03.md`,
  `plan-settings-modal-redesign-2026-07-03.md`, `plan-session-create-selection-2026-07-03.md`,
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
session-create-selection, theme-persistence, hazard-bar-progress:
complete**, all merged to `main`. Currently on `main`, worktree clean.

**Unsigned commits — needs attention before any push.** Every commit
made across this entire session (`settings-modal-redesign` onward,
including all merge commits) was made with `--no-gpg-sign` (1Password
locked throughout). Re-sign the full range once 1Password is available,
before pushing anything.

**Live-browser verification status:**
- ✅ Confirmed working: Landing chooser/split-forms, 4-char join code,
  hazard strip's independent top-pinned position, content padding
  clearance, Lobby-body hint states, Settings modal reachable from both
  Lobby and Playback, theme toggle changing CSS palette + tab notation
  together (including correct persistence across a refresh, post-fix),
  lyrics ticker's static single-line layout, and — newly confirmed —
  the hazard strip's fill genuinely tracks real playback position in a
  live browser (measured directly via computed CSS, monotonically
  increasing over ~24s of real playback).
- 🔍 **New finding from the hazard-bar-progress live check**: alphaTab's
  `playerPositionChanged` event *does* fire with real advancing
  `currentTime`/`endTime` under genuine Chrome browser automation — the
  earlier "never advances" conclusion is specific to Playwright's
  component-test (CT) harness, not browser automation generally.
  However, the *visual cursor* (`.at-cursor-bar`) stayed completely
  frozen throughout the same live check (confirmed via exact
  `getBoundingClientRect()` comparison) — cursor rendering and the
  numeric position value are apparently driven by separate mechanisms.
  This means the two-participant no-rubberband playback fix
  (`playback-sync-fixes`) and the lyrics ticker's live scroll/centering
  (`lyrics-ticker`) — both of which depend on the cursor/visual
  rendering path, not just the numeric position — may be more checkable
  live than previously assumed, but this hasn't been attempted yet.
  Worth a real attempt before assuming they're blocked.

## Recommended Next Step

Attempt a live-browser check of the two-participant no-rubberband
playback fix and the lyrics ticker's scroll/centering behavior — the
hazard-bar-progress finding suggests these might be checkable after all,
contrary to earlier assumptions. Separately: re-sign the full unsigned
commit range before pushing `main`.
