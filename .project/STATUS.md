# sync-tab-scroll — Project Status

_Updated: 2026-07-03 (branch `consented-song-submission`, post `/ardd-plan`). Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 3 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |
| features.md | — | 0 |

## Open Questions

### datamodel.md
- Per-song vs. per-submitter consent recording — resolved for this plan as
  per-song; revisit only if re-recording consent per song becomes real
  friction for a repeat submitter.
- CLI drop-in vs. web upload form for submission — resolved for this plan
  as CLI, matching the pipeline's existing operator-driven model; a web
  upload endpoint was explicitly considered and rejected (new public HTTP
  surface, no existing submitter identity/session concept, no evidence of
  need).
- Real ToS legal text — not a design decision; placeholder/dev value used
  until an operator supplies real text.

A fourth question is resolved, not open, but worth noting since it's a
non-obvious reading of the feature's own wording: "not served to clients
other than its own submitter" is implemented as *global* exclusion (no
one sees an unconsented song, submitter included) rather than
per-submitter visibility, since this app has no auth and thus no way to
identify "the submitter's own client." See
`plan-consented-song-submission-2026-07-03.md`'s Open Questions for the
full reasoning.

## Cross-Artifact Issues

None found this pass. The new "Consent Record" concept (datamodel.md) is
referenced consistently by infrastructure.md's Song Consent Gate and
pipeline.md's Consent Recording section — same name, same on-disk-only
scope (never part of `CatalogSong`, never sent to a client). The new
`requireSongConsent`/`REQUIRE_SONG_CONSENT` config flag is named
consistently across infrastructure.md, datamodel.md, and pipeline.md.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)

## Constitution Compliance

No violations. The new opt-in `requireSongConsent` config flag and its
`catalog-loader.ts` branch are recorded in the plan's Complexity Tracking
table as a justified, feature-required deviation (default behavior is
unchanged; the dual-mode branch exists only because the constitution's
Production Posture requires the self-hosted/small-group default to stay
untouched).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

0 known defects as of the last full `/ardd-verify` pass (2026-07-03, on
the `fix-lyric-css-colors-dead-code` branch this worktree branched from).
Not re-run in this worktree — no code was touched here, only artifacts
and a new plan.

## Feature Backlog

`consented-song-submission` targeted by this plan but still shows
`Status: backlogged` in `features.md` — it flips to `planned` when
`/ardd-tasks` selects and approves `plan-consented-song-submission-
2026-07-03.md`, not before. Feature-backlog counts otherwise unchanged
from the parent branch.

## Plans

- `plan-consented-song-submission-2026-07-03.md` — **draft**, on branch
  `consented-song-submission`. Single-feature plan, 3 phases, 9 tasks.
  Run `/ardd-tasks` to approve and generate tasks.

## Recommended Next Step

Run `/ardd-tasks` to approve `plan-consented-song-submission-2026-07-03.md`
and generate its task list, or review the plan's Open Questions first if
any of the three resolved defaults (per-song consent, CLI-not-web
submission, placeholder ToS) need a different call before implementation
starts.
