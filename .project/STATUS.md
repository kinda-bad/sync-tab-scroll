# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-analyze`, after an `/ardd-verify` pass
cleared 3 of `DEFECTS.md`'s 5 defects — down to 2). Repo is on `main`. No
cross-artifact contradictions found._

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
  implemented design (metronome is a client-local preference; count-in has
  a host toggle in the Settings modal). Owned by `/ardd-feature`/
  `/ardd-plan`/`/ardd-tasks`, not this skill — flagged for a future pass.
- [GAP] `ui.md`'s "Connection lost" state (client's own WS reachability)
  and `datamodel.md`'s `Participant.connectionStatus` field (server's
  per-participant socket state) share a name but describe different
  concepts. Not contradictory, just worth disambiguating if it causes
  confusion later.
- [GAP] `ui.md`/`infrastructure.md` still don't mention
  `installCountInCursorGuard` (`client/src/playback-sync.ts`), which pins
  the cursor during the count-in window. Not a contradiction, just drift
  for a future `/ardd-verify` to record as a doc addition.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)
- [OPEN] `lyricLineBreaks` retention (see above)

## Constitution Compliance

No new violations found this pass. Principle VIII (Config via `.env`,
Synced by Example) remains implemented pre-commit; the CI half is a known,
explicitly-deferred gap — see Code-vs-Artifact Defects below. No other
principle violations spotted in this artifact-only pass.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅ on `main` (a `ui.md` Preferences-tab edit is drafted
  on the unmerged `grunge-cyberpunk-themes` branch, which will make this
  stale once merged — see In Flight).

## Code-vs-Artifact Defects

2 known defects — see `DEFECTS.md`, last checked 2026-07-06 (fresh
codebase pass, confirmed against current code — not assumed). Down from
5: `infrastructure.md`'s percussion-detection wording and render-scaling
doc gap, the `host-remove-participant` UI/docs gap, and `pipeline.md`'s
lrclib wording are all confirmed fixed and no longer listed. Remaining:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the same wrong percussion-detection claim (`track.percussionArticulations`)
  that `infrastructure.md`'s copy already fixed — the defects-followup
  branch's scope only touched `infrastructure.md`.
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's
  CI half is unmet — no `.github/workflows/` exists (confirmed). Still
  open, separate decision — see Recommended Next Step.

## Feedback

1 open feedback file — `feedback-lyrics-only-view-6386.md` (bug: the
lyrics-only view still shows nothing visible — possibly the earlier
`feedback-lyrics-only-view-d7d8.md` fix, merged 2026-07-04, didn't fully
resolve it, or it's regressed since). Will be picked up by the next
`/ardd-plan`.

## Feature Backlog

2 backlogged · 0 planned · 0 tasked · 7 implemented — see
`.project/artifacts/features.md`. `participant-selected-part` and
`grunge-cyberpunk-themes` remain `backlogged` in `features.md` itself — a
plan now exists for the latter
(`plan-grunge-cyberpunk-themes-2026-07-06.md`, on its own unmerged
branch), but per `/ardd-tasks`'s convention the `Status` flip to `planned`
only happens when that plan is selected/approved via `/ardd-tasks`, not at
draft time.

## In Flight

- Branch `grunge-cyberpunk-themes` (plain branch, not a worktree) —
  `plan-grunge-cyberpunk-themes-2026-07-06.md` drafted (reworks the
  default theme into a louder "riot" palette, adds a new "cyberpunk"
  theme). `brand.md`/`ui.md` design changes and this plan are committed
  there, not yet on `main`, not yet approved/tasked.

`lyrics-ticker-font-size` (3/3) and `defects-followup` (9/9) have both
been merged into `main` and their worktrees/branches pruned.

## Recommended Next Step

1. Investigate the lyrics-only-view bug reported in
   `feedback-lyrics-only-view-6386.md` — either live-debug it directly or
   fold it into the next `/ardd-plan` pass.
2. Switch to `grunge-cyberpunk-themes` and run `/ardd-tasks` to approve
   the theme plan and generate its task list, then implement (or merge
   its current draft-plan commits to `main` first if you'd rather plan
   from there — either works, nothing beyond `brand.md`/`ui.md`/the plan
   file has changed on that branch yet).
3. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists — a real scope decision, not a mechanical fix.
4. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   plus the other minor cross-artifact notes above.
