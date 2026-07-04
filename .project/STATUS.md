# sync-tab-scroll — Project Status

_Updated: 2026-07-03 (post `/ardd-tasks` on branch `host-transfer` — plan approved, tasks generated). Keep this current as artifacts are refined and open questions are resolved._

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

No violations. The one open violation (Principle II, "No Dead
Architecture" — `client/src/brand-colors.ts`'s unused `lyricCssColors`
export) was fixed on the `fix-lyric-css-colors-dead-code` branch and
confirmed resolved (see Code-vs-Artifact Defects). Principles I (single
client store), III (bootstrap files), IV (handler routing), V (library
idioms), VI (named types), and VII (test-first) all spot-checked clean
against current code in the same-day full re-survey.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-03. All-clear:
the 5 defects from the pre-refine pass were confirmed resolved by doc
corrections, and the 1 defect surfaced by the subsequent full re-survey
(`lyricCssColors` dead code) has now been fixed in code (`fix-lyric-css-
colors-dead-code` branch, commit `8457a52`, unsigned — 1Password locked)
and reverified: zero remaining references, 25 unit + 22 component tests
passing.

## Feature Backlog

3 backlogged (`metronome-toggle`, `count-in-toggle`,
`consented-song-submission`) · 0 planned · 2 tasked (`host-delegation`,
`request-to-become-host`, both via `plan-host-transfer-2026-07-03.md` /
`tasks-host-transfer-55dd.md`) · 2 implemented
(`test-coverage-backfill`, `playwright-client-coverage`) — see
`.project/artifacts/features.md`.

## Plans

- `plan-theme-persistence-2026-07-03.md`, `plan-hazard-bar-progress-2026-07-03.md`,
  `plan-settings-modal-redesign-2026-07-03.md`, `plan-session-create-selection-2026-07-03.md`,
  `plan-playback-sync-fixes-2026-07-03.md`, `plan-lyrics-ticker-2026-07-03.md`,
  `plan-ui-polish-pass-2026-07-03.md`, `plan-playwright-coverage-2026-07-02.md`,
  `plan-test-coverage-2026-07-02.md`, `plan-lobby-cursor-modes-2026-07-03.md`,
  `plan-song-catalog-selection-2026-07-01.md`, `-2026-07-02.md`,
  `plan-live-rendering-pivot-2026-07-01.md` — all implemented, merged to
  `main`.
- `plan-fix-lyric-css-colors-dead-code-2026-07-03.md` — **approved**, on
  branch `fix-lyric-css-colors-dead-code`. Single-phase cleanup: deleted
  the unused `lyricCssColors` export from `client/src/brand-colors.ts`
  (the sole `DEFECTS.md` finding). Tasks:
  `tasks-fix-lyric-css-colors-dead-code-257c.md` — **completed**, 3/3
  tasks. No `features:` bound to this plan.
- `plan-host-transfer-2026-07-03.md` — **approved**, on branch
  `host-transfer`. Targets `features: [host-delegation,
  request-to-become-host]` (both now `tasked`). Combines both into one
  design (a shared `transferHost()` helper in `host-succession.ts`,
  reused by a direct `host-delegate` message and a consent-based
  `request-host`/`host-request-decline` pair) after two
  independently-planned drafts — `plan-host-delegation-2026-07-03.md`
  (branch `host-delegation`) and `plan-request-to-become-host-2026-07-03.md`
  (branch `request-to-become-host`) — were found to duplicate the same
  hostId/role-swap logic and edit the same insertion points in
  `infrastructure.md`/`ui.md`. Both of those are now **superseded** (see
  their own branches). Tasks: `tasks-host-transfer-55dd.md` — **ready**,
  4 phases, 8 tasks.
- Also drafted this session, independently, no conflicts found:
  `plan-metronome-count-in-toggle-2026-07-03.md` (branch
  `metronome-count-in-toggle`, targets `metronome-toggle` +
  `count-in-toggle`) and `plan-consented-song-submission-2026-07-03.md`
  (branch `consented-song-submission`). Both **draft**, not yet run
  through `/ardd-tasks`.

## Implementation Status

**live-rendering-pivot, song-catalog-selection, lobby-cursor-modes,
test-coverage-backfill, playwright-client-coverage, ui-polish-pass,
playback-sync-fixes, lyrics-ticker, settings-modal-redesign,
session-create-selection, theme-persistence, hazard-bar-progress:
complete**, all merged to `main`.

**fix-lyric-css-colors-dead-code: complete**, on its own unmerged branch
(commit `8457a52`), not yet merged to `main`. Deleted the unused
`lyricCssColors` export; 25 unit + 22 component tests still passing.

**Unsigned commits — needs attention before any push.** Every commit
made across this entire session (`settings-modal-redesign` onward,
including all merge commits, and the `fix-lyric-css-colors-dead-code`
commit above) was made with `--no-gpg-sign` (1Password locked
throughout). Re-sign the full range once 1Password is available, before
pushing anything.

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

`host-transfer` has tasks ready (`tasks-host-transfer-55dd.md`, 8 tasks) —
run `/ardd-implement` to start Phase 1 (extracting `transferHost()`).
`metronome-count-in-toggle` and `consented-song-submission` still have
draft plans awaiting their own `/ardd-tasks` pass. Merge
`fix-lyric-css-colors-dead-code` back to `main` first (its work is
complete and `DEFECTS.md` is all-clear). Separately, and not blocking any
of this: attempt a live-browser check of the two-participant
no-rubberband playback fix and the lyrics ticker's scroll/centering
behavior, and re-sign the full unsigned commit range before pushing
anything.
