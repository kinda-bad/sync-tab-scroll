# sync-tab-scroll — Project Status

_Updated: 2026-07-08 (`/ardd-implement` — completed all 4 tasks for
`participant-selected-part`; feature flipped to `implemented`). Repo is on
branch `participant-selected-part`, not yet merged to `main`. No
cross-artifact contradictions found._

ARDD update available: installed `3c72550`, source at `0692443` — run
`/ardd-update`.

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

- [GAP] `ui.md`'s "Connection lost" state (client's own WS reachability)
  and `datamodel.md`'s `Participant.connectionStatus` field (server's
  per-participant socket state) share a name but describe different
  concepts. Not contradictory, just worth disambiguating later.
- [GAP] `ui.md`/`infrastructure.md` still don't mention
  `installCountInCursorGuard` (`client/src/playback-sync.ts`). Not a
  contradiction, just drift for a future `/ardd-verify` to record.
- [MINOR] The feature register's pre-convention "Metronome toggle"/
  "Count-in toggle" entries still carry their original logging-time
  descriptions, superseded by the implemented design.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)
- [VAGUE] `lyricLineBreaks` retention — still unresolved whether it's
  worth keeping given nothing reads the grouped result for layout

## Constitution Compliance

No violations found this pass. Principle VIII is **fully satisfied** —
the `.env`/`.env.example` key-parity lint runs pre-commit, and typecheck
+ the full test suite (minus e2e, deliberately deferred) run in CI on
every push/PR to `main` (`.github/workflows/ci.yml`), confirmed via a
real passing run on `main`.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure` if
  desired — the new Continuous Integration section isn't reflected in
  the container diagram; judgment call whether CI belongs there at all,
  since it's not a runtime component, not blocking)
- ui.md — stale ⚠️ (run `/ardd-render ui` — the new "Every row shows
  which part..." bullet under Participants doesn't change the component
  hierarchy, just row content, so this is low priority)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-07 (scoped
refresh confirming the CI workflow matches `infrastructure.md` exactly
and passed a real run). Down from 2 — the `constitution.md` CI claim is
resolved and no longer listed:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim (`track.percussionArticulations`)
  that `infrastructure.md`'s copy already fixed (`track.isPercussion`).

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 12 implemented — see
`.project/features/`. Backlog is empty.

## In Flight

Branch `participant-selected-part` (current checkout, not a separate
worktree) — `tasks-participant-selected-part-bc26.md` completed, 4/4, all
commits signed. Not yet merged into `main`.

## Recommended Next Step

1. Merge `participant-selected-part` into `main` (all tasks complete,
   full client vitest + CT suites pass, no regressions).
2. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `3c72550`, source at `0692443`).
3. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred — see `plan-github-actions-ci-workflow-2026-07-07.md`'s Open
   Questions).
4. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and whether `infrastructure.md`'s
   container diagram should include CI at all.
