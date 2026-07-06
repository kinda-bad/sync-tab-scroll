# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-tasks`, approved and tasked the
lyrics-gap-timing-indicator plan on its own branch). Repo is on `main`,
pushed to `origin/main`. No cross-artifact contradictions found._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 4 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

### datamodel.md
- Per-song vs. per-submitter consent recording — resolved for
  `consented-song-submission` as per-song; revisit only if re-recording
  consent per song becomes real friction for a repeat submitter.
- CLI drop-in vs. web upload form for submission — resolved as CLI,
  matching the pipeline's existing operator-driven model.
- Real ToS legal text — not a design decision; a placeholder/dev value is
  used (`record-consent`'s `tosVersion`, production-annotated) until an
  operator supplies real text.
- Whether `CatalogSong.lyricLineBreaks` is worth keeping — computed and
  unit-tested, but the current single-line ticker overlay never uses the
  grouped line boundaries for layout.

These are documented defaults, not blockers.

## Cross-Artifact Issues

- [MINOR] The feature register's "Metronome toggle"/"Count-in toggle"
  entries still carry their original logging-time descriptions,
  superseded by the implemented design. Owned by
  `/ardd-feature`/`/ardd-plan`/`/ardd-tasks`, not this skill.
- [GAP] `ui.md`'s "Connection lost" state and `datamodel.md`'s
  `Participant.connectionStatus` field share a name but describe different
  concepts. Not contradictory, just worth disambiguating later.
- [GAP] `ui.md`/`infrastructure.md` still don't mention
  `installCountInCursorGuard` (`client/src/playback-sync.ts`). Not a
  contradiction, just drift for a future `/ardd-verify` to record.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)
- [OPEN] `lyricLineBreaks` retention (see above)

## Constitution Compliance

No new violations found this pass. Principle VIII's CI half remains a
known, explicitly-deferred gap — see Code-vs-Artifact Defects below.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-render ui` — the theme-control Preferences
  tab, the full-lyrics-sheet redesign, and the gap-timing-indicator design
  have all landed since this was last rendered)

## Code-vs-Artifact Defects

2 known defects — see `DEFECTS.md`, last checked 2026-07-06, **before**
the theme rework and lyrics-sheet redesign merged — worth a fresh
`/ardd-verify` pass given how much client code has changed since. Both
declined for inclusion in the `lyrics-gap-timing-indicator` and
`grunge-cyberpunk-themes` plans — won't re-prompt:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim that `infrastructure.md`'s copy
  already fixed.
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's
  CI half is unmet — no `.github/workflows/` exists.

## Feature Backlog

3 backlogged · 0 planned · 0 tasked · 8 implemented — see
`.project/features/`.

- `participant-selected-part` (participant list shows each member's
  currently selected part) — backlogged.
- `lyrics-gap-timing-indicator` — approved and tasked on its own branch
  (`tasks-lyrics-gap-timing-indicator-6541.md`, 9 tasks, `ready`); the
  register on `main` still says `backlogged` since that flip hasn't
  merged yet.
- `readme-local-setup-and-gp-ingestion` (README documents local dev setup
  and `.gp` ingestion) — backlogged, just logged this pass.

## In Flight

- Branch `lyrics-gap-timing-indicator` (plain branch, not a worktree) —
  plan approved, `tasks-lyrics-gap-timing-indicator-6541.md` generated
  (9 tasks across 3 phases: gap/beat-math via alphaTab's
  `MasterBar`/`tickPositionToTimePosition` API, dots + drain-bar
  rendering, verification), `ready`, not yet started. `ui.md`/`brand.md`
  design changes, the plan, and the tasks file are all committed there,
  not yet on `main`.

## Recommended Next Step

1. Implement `tasks-lyrics-gap-timing-indicator-6541.md` (`/ardd-implement`,
   inline or delegated).
2. Run `/ardd-plan readme-local-setup-and-gp-ingestion` when ready to
   design the README feature.
3. Consider a fresh `/ardd-verify` pass — a large amount of client code
   changed across the theme-rework and lyrics-sheet-redesign merges, and
   the last verify pass predates both.
4. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists — a real scope decision, not a mechanical fix.
5. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the other minor cross-artifact notes above, and running `/ardd-render
   ui` to refresh the stale UI diagram.
