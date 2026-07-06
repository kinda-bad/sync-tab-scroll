# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-plan`, drafting a second lyrics-only-view fix
after `/ardd-tasks` approved and tasked the theme plan). Repo is on
`main`; a delegated worktree is implementing the theme plan in the
background. No cross-artifact contradictions found._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 4 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |
| features.md | — | 0 |

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

- [MINOR] `features.md`'s "Metronome toggle"/"Count-in toggle" entries
  still carry their original logging-time descriptions, superseded by the
  implemented design. Owned by `/ardd-feature`/`/ardd-plan`/`/ardd-tasks`,
  not this skill — flagged for a future pass.
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
- ui.md — current ✅ on `main` (a `ui.md` Preferences-tab edit is being
  implemented on the in-flight `grunge-cyberpunk-themes` worktree, which
  will make this stale once merged).

## Code-vs-Artifact Defects

2 known defects — see `DEFECTS.md`, last checked 2026-07-06 (confirmed
against current code). Both were surfaced and declined in
`plan-grunge-cyberpunk-themes-2026-07-06.md` (unrelated to that plan) and
now also in `plan-lyrics-only-view-fix-2-2026-07-06.md` (unrelated to
that one too) — won't re-prompt:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim that `infrastructure.md`'s copy
  already fixed.
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's
  CI half is unmet — no `.github/workflows/` exists.

## Feedback

1 feedback file, `feedback-lyrics-only-view-6386.md` — `status: open` on
`main`, but its one bug item has been incorporated into
`plan-lyrics-only-view-fix-2-2026-07-06.md` on the unmerged
`lyrics-only-view-fix-2` branch (where the file is already flipped to
`status: planned`); `main`'s copy will catch up once that branch merges.

## Feature Backlog

2 backlogged · 0 planned · 0 tasked · 7 implemented in `features.md` on
`main` right now. `participant-selected-part` remains backlogged.
`grunge-cyberpunk-themes` is further along on its own branch (currently
`Status: tasked`, being implemented — see In Flight) but that flip hasn't
reached `main` yet either.

## In Flight

- Worktree `.claude/worktrees/agent-a74576c25e122e82d` (branch
  `worktree-agent-a74576c25e122e82d`) — `tasks-grunge-cyberpunk-themes-
  4982.md` in-progress, 2/16 (riot token rework + cyberpunk theme +
  theme-control UI redesign — delegated subagent running in the
  background).
- Branch `grunge-cyberpunk-themes` (plain branch, source for the worktree
  above) — plan approved and tasked, `brand.md`/`ui.md` design changes
  committed, not yet on `main`.
- Branch `lyrics-only-view-fix-2` (plain branch) —
  `plan-lyrics-only-view-fix-2-2026-07-06.md` drafted (not yet
  approved/tasked). Diagnoses the bug as likely `createHeadlessPlayer`'s
  permanently-`display:none` container hitting alphaTab's known
  "width=0, element invisible" render-skip quirk (already documented
  elsewhere in `playback-engine.ts` for the visible tab-container path),
  plus a confirmed CSS specificity conflict between `App.svelte` and
  `lyrics.css` over `.full-lyrics-view`'s `display` property.

## Recommended Next Step

1. Run `/ardd-tasks` on `plan-lyrics-only-view-fix-2-2026-07-06.md` to
   approve it and generate its task list, then implement (Phase 1
   reproduces both hypotheses before Phase 2 commits to a fix).
2. Wait for the `grunge-cyberpunk-themes` worktree subagent to finish
   (2/16 so far), then merge and re-analyze.
3. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists — a real scope decision, not a mechanical fix.
4. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   plus the other minor cross-artifact notes above.
