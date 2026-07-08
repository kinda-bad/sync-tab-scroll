# sync-tab-scroll — Project Status

_Updated: 2026-07-07 (`/ardd-verify`, cleared the now-resolved
`constitution.md` CI defect). Repo is on `main`, pushed to `origin/main`.
No cross-artifact contradictions found._

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
- ui.md — current ✅

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-07 (scoped
refresh confirming the CI workflow matches `infrastructure.md` exactly
and passed a real run). Down from 2 — the `constitution.md` CI claim is
resolved and no longer listed:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim (`track.percussionArticulations`)
  that `infrastructure.md`'s copy already fixed (`track.isPercussion`).

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 11 implemented — see
`.project/features/`.

- `participant-selected-part` (participant list shows each member's
  currently selected part) — the only remaining backlog item.

## In Flight

None — everything merged and pushed to `main` as of this pass.

## Recommended Next Step

1. Run `/ardd-plan participant-selected-part` when ready to design the
   last backlogged feature.
2. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred — see `plan-github-actions-ci-workflow-2026-07-07.md`'s Open
   Questions).
3. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and whether `infrastructure.md`'s
   container diagram should include CI at all.
