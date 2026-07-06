# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-feature`, logging
`readme-local-setup-and-gp-ingestion`; also committed the
`0003-per-feature-files` ARDD migration that had been sitting applied but
uncommitted since earlier this session). Repo is on `main`, pushed to
`origin/main`. No cross-artifact contradictions found._

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
- `lyrics-gap-timing-indicator` — a plan now exists
  (`plan-lyrics-gap-timing-indicator-2026-07-06.md`, draft, on its own
  unmerged branch); the register itself still says `backlogged` since
  `/ardd-tasks` is what flips it to `planned`.
- `readme-local-setup-and-gp-ingestion` (README documents local dev setup
  and `.gp` ingestion) — backlogged, just logged this pass.

## In Flight

- Branch `lyrics-gap-timing-indicator` (plain branch, not a worktree) —
  `plan-lyrics-gap-timing-indicator-2026-07-06.md` drafted (not yet
  approved/tasked). `ui.md`/`brand.md` design changes and the plan are
  committed there, not yet on `main`. Technical approach: derives
  measure/beat boundaries from the headless alphaTab instance's own
  loaded score (`MasterBar.start`/`calculateDuration()` +
  `tickPositionToTimePosition()`), not `CatalogSong.bpm` (display-only).
  Rebased onto `main` after this pass's migration commit — up to date.

## Recommended Next Step

1. Run `/ardd-tasks` on `plan-lyrics-gap-timing-indicator-2026-07-06.md`
   to approve it and generate its task list, then implement.
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
