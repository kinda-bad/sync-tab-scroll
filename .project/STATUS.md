# sync-tab-scroll — Project Status

_Updated: 2026-07-07 (`/ardd-implement`, merged and pushed the GitHub
Actions CI workflow — resolves the deferred CI half of constitution
Principle VIII). Repo is on `main`, pushed to `origin/main`. No
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

No violations found this pass. Principle VIII is now **fully satisfied**
— the `.env`/`.env.example` key-parity lint runs pre-commit, and
typecheck + the full test suite (minus e2e, deliberately deferred) now
run in CI on every push/PR to `main` (`.github/workflows/ci.yml`),
verified with real GitHub Actions runs including a deliberate-breakage
test that correctly failed red. `DEFECTS.md`'s corresponding entry is
stale as of this pass — see Code-vs-Artifact Defects below.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure` — the
  new Continuous Integration section isn't reflected in the container
  diagram; judgment call whether CI belongs on that diagram at all, since
  it's not a runtime component)
- ui.md — current ✅

## Code-vs-Artifact Defects

2 known defects — see `DEFECTS.md`, last checked 2026-07-07, **before**
this pass's CI-workflow merge. One of the two (`constitution.md`'s "no
CI" claim) is now stale — `.github/workflows/ci.yml` exists and is
verified working — worth a fresh `/ardd-verify` pass to clear it
properly, though the fix is obvious enough to not block anything:

- `datamodel.md` — cosmetic: `CatalogPart.trackIndex`'s note still has
  the wrong percussion-detection claim (`track.percussionArticulations`)
  that `infrastructure.md`'s copy already fixed (`track.isPercussion`).
  Still accurate, unrelated to this pass.
- `constitution.md` — **now resolved in code**, `DEFECTS.md` wording is
  stale: Principle VIII's CI half is no longer unmet —
  `.github/workflows/ci.yml` runs typecheck + test suite on push/PR to
  `main`, confirmed working via real Actions runs.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 11 implemented — see
`.project/features/`.

- `participant-selected-part` (participant list shows each member's
  currently selected part) — the only remaining backlog item.

## In Flight

None — everything merged and pushed to `main` as of this pass.

## Recommended Next Step

1. Run `/ardd-verify` (or a quick manual fix) to clear `DEFECTS.md`'s now-
   stale "no CI" claim for `constitution.md`.
2. Run `/ardd-plan participant-selected-part` when ready to design the
   last backlogged feature.
3. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred this pass — see `plan-github-actions-ci-workflow-2026-07-07.md`'s
   Open Questions).
4. Not blocking: `datamodel.md`'s duplicated percussion-detection claim,
   the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and whether `infrastructure.md`'s
   container diagram should include CI at all.
