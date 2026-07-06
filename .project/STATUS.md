# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-analyze`, after merging the completed
defects-followup worktree into `main` and pruning it). Repo is on `main`.
No cross-artifact contradictions found; findings are the same handful of
minor gaps plus one newly-confirmed duplicate defect._

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

5 known defects — see `DEFECTS.md`, last checked 2026-07-06. **4 of the 5
are now fixed in code** (percussion-detection wording, render-scaling doc
gap, `host-remove-participant` UI, lrclib wording — all landed via the
defects-followup merge), but `DEFECTS.md` itself hasn't been regenerated
since, so it still lists them as open. Run `/ardd-verify` to refresh and
clear them. Summary:

- `infrastructure.md` — cosmetic (percussion-detection wording) —
  **fixed in code**, `DEFECTS.md` stale.
- `infrastructure.md` — drift (undocumented render-scaling) — **fixed in
  code**, `DEFECTS.md` stale.
- `infrastructure.md` — drift (`host-remove-participant` client UI/docs)
  — **fixed in code** (Remove button + self-removal handling), `DEFECTS.md`
  stale.
- `datamodel.md` — cosmetic: the same wrong percussion-detection claim
  duplicated in `CatalogPart.trackIndex`'s note. **Not fixed** — the
  defects-followup work only touched `infrastructure.md`'s copy.
- `pipeline.md` — drift (lrclib wording) — **fixed in code**, `DEFECTS.md`
  stale.
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's
  CI half is unmet — no `.github/workflows/` exists. Still open, separate
  decision — see Recommended Next Step.

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

1. Run `/ardd-verify` to refresh `DEFECTS.md` — 4 of its 5 listed defects
   are already fixed in code and just need the file regenerated.
2. Switch to `grunge-cyberpunk-themes` and run `/ardd-tasks` to approve
   the theme plan and generate its task list, then implement (or merge
   its current draft-plan commits to `main` first if you'd rather plan
   from there — either works, nothing beyond `brand.md`/`ui.md`/the plan
   file has changed on that branch yet).
3. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists — a real scope decision, not a mechanical fix.
4. Not blocking: `datamodel.md`'s duplicated percussion-detection claim
   (not fixed by defects-followup, only `infrastructure.md`'s copy was),
   plus the other minor cross-artifact notes above.
