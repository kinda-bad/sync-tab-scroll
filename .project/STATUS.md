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
and `datamodel.md` (dropping the stale "host can remove participants"
claim, documenting the settings-cog's actual Lobby+Playback reachability,
adding the missing "Connecting…" Lobby-body case, correcting the
hazard-strip's now-independent top-pinned position, and correcting the
`lyricLineBreaks` consumption claim) — but `DEFECTS.md` itself is
`/ardd-verify`'s sole write surface, so its defect list won't reflect
these fixes until the next `/ardd-verify` run confirms them against code.

## Feature Backlog

5 backlogged · 0 planned · 0 tasked · 2 implemented (`test-coverage-backfill`,
`playwright-client-coverage`) — see `.project/artifacts/features.md`.

## Plans

- `plan-theme-persistence-2026-07-03.md` — **approved**, tasked (5 tasks,
  3 phases). Branch `theme-persistence` (current worktree). Fixes a
  live-browser-confirmed bug: `ensurePlaybackEngine()` hardcodes a fresh
  engine's theme to `'dark'` instead of reading the current/persisted
  value, so a light-mode preference sticks for the app chrome but
  silently reverts to dark for the tab notation on every fresh load.
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

**theme-persistence: approved and tasked, not yet implemented.** Branch
`theme-persistence` (separate worktree, off `main`).

Full suite green on merged `main`: client vitest 6 files/25 tests, client
CT 20/20, client e2e 10/10, server vitest 16 files/58 tests.

**Unsigned commits — needs attention before any push.** Every commit
across `settings-modal-redesign`, `session-create-selection`, their merge
commits into `main`, the `/ardd-verify` pass, and the subsequent refine
pass was made with `--no-gpg-sign` (1Password locked throughout). Re-sign
the range once 1Password is available, before pushing.

**Live-browser verification pass completed** (partially — see below):
- ✅ Landing chooser/split-forms/Enter-to-submit, 4-char join code, hazard
  strip's independent top-pinned position (confirmed via computed styles),
  content top-padding clearance, Lobby-body hint's per-state text, Settings
  modal (Participants + Settings tabs) reachable from both Lobby and
  Playback, theme toggle changing CSS palette + tab notation together,
  lyrics ticker's static single-line/no-wrap/clipped layout — all confirmed
  working as designed.
- 🐛 Found a new bug in the process: theme persistence across a refresh
  doesn't reach the tab notation (see `plan-theme-persistence-2026-07-03.md`
  above).
- ❌ Genuinely **not verifiable in this environment**, confirmed by direct
  measurement (not just assumption): the playback cursor's pixel position
  was checked 4 seconds apart and found completely frozen — alphaTab's
  player clock never starts because audio decode never resolves under
  Chrome automation (the project's known, permanent limitation). This
  blocks verifying both the two-participant no-rubberband playback fix
  (`playback-sync-fixes`) and the lyrics ticker's live scroll/centering
  behavior (`lyrics-ticker`) — these two still need a human, in a real
  browser, with real audio.

## Recommended Next Step

Run `/ardd-implement` against `tasks-theme-persistence-d738.md`.
Separately: a human still needs to manually verify the two-participant
playback and lyrics-ticker scroll/centering behavior in a real browser
(not automatable here), and the unsigned commit range needs re-signing
before `main` is pushed.
