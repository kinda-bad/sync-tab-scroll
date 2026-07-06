# sync-tab-scroll — Project Status

_Updated: 2026-07-06 (`/ardd-analyze`, after logging the
`grunge-cyberpunk-themes` feature idea and delegating both tasked plans to
isolated worktree subagents). Repo is on `main`. No cross-artifact
contradictions found; findings are the same handful of minor gaps plus one
newly-confirmed duplicate defect._

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
- ui.md — current ✅

## Code-vs-Artifact Defects

5 known defects — see `DEFECTS.md`, last checked 2026-07-06 (fresh
full-codebase pass, refreshing 2026-07-05's). Summary:

- `infrastructure.md` — cosmetic: percussion-detection comment says
  `track.percussionArticulations`; code reads `track.isPercussion` directly
  (`client/src/tab-renderer.ts:106,139`).
- `infrastructure.md` — drift: undocumented small-screen render-scaling
  via `tabScaleForViewportWidth` (`client/src/tab-renderer.ts:3,62`).
- `infrastructure.md` — drift: `host-remove-participant` is a fully
  implemented server handler with no client-side entry point or docs.
  **Now tasked** — `tasks-defects-followup-c196.md` targets
  closing this; not yet implemented as of this pass.
- `datamodel.md` — cosmetic (newly found this pass): the same wrong
  percussion-detection claim is duplicated in `CatalogPart.trackIndex`'s
  note.
- `pipeline.md` — drift: lrclib-assisted-line-break wording implies GP's
  syllable stream still supplies line text; actually lrclib supplies the
  text directly, GP only supplies per-line timestamps.
- `constitution.md` — drift (pre-existing, deferred): Principle VIII's "run
  in CI" half is unmet — no `.github/workflows/` exists. The prior
  "no configured git remote" justification is now stale (`origin` exists);
  the CI-provider decision itself remains open, see Recommended Next Step.

## Feature Backlog

2 backlogged · 0 planned · 0 tasked · 7 implemented — see
`.project/artifacts/features.md`. `participant-selected-part` (participant
list shows each member's currently selected part) and
`grunge-cyberpunk-themes` (two new selectable dark/light theme pairs — a
louder Yeah Yeah Yeahs/Nirvana-inspired variant of the current theme, and a
`sync-scroll`-palette cyberpunk theme) remain backlogged — target either
with `/ardd-plan <slug>` when ready.

## In Flight

- Worktree `.claude/worktrees/agent-a3d9149b39e896685` (branch
  `worktree-agent-a3d9149b39e896685`) — `tasks-defects-followup-c196.md`
  in-progress, 0/9 (Remove-participant UI, self-removal handling, 3
  artifact wording fixes, verification — delegated subagent still running).
- Worktree `.claude/worktrees/agent-af741d85be2762830` (branch
  `worktree-agent-af741d85be2762830`) — `tasks-lyrics-ticker-font-size-
  7c31.md` completed, 3/3 (font-size bumped to `1.125rem`, live-verified in
  both themes via a temporary Playwright CT harness spec, no clipping
  found; strip-height task skipped as not needed). **Ready to merge** —
  not yet merged into `main`.

## Recommended Next Step

1. Merge the completed `worktree-agent-af741d85be2762830` branch (lyrics
   ticker font-size, 3/3 done) into `main`, then run `/ardd-analyze` again.
2. Wait for the `worktree-agent-a3d9149b39e896685` subagent
   (defects-followup, 9 tasks) to finish, then merge and re-analyze.
3. Decide the CI-provider question for constitution Principle VIII now
   that a remote exists (see Code-vs-Artifact Defects) — a real scope
   decision, not a mechanical fix.
4. Not blocking: the minor cross-artifact notes above (`features.md`'s
   stale toggle entries, `connectionStatus` naming overlap, count-in
   cursor guard doc drift, `datamodel.md`'s duplicated percussion-detection
   claim).
