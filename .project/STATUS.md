# sync-tab-scroll — Project Status

_Updated: 2026-07-08 (`/ardd-analyze`, after `/ardd-feature` logged
`catalog-activation-key-access`). Repo is on `main`, pushed to `origin`
(all commits signed — the earlier `fix-percussion-doc-drift` merge and
its unsigned-commit trail were re-signed via rebase and pushed this
session). `STATUS.md` and both newly-logged feature files are staged but
not yet committed. No cross-artifact contradictions found._

ARDD update available: installed `9189817`, source at `5fba0e5` — run
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

These are documented defaults, not blockers. All three carry `[OPEN:
...]` markers in the artifact text despite already stating a resolved
answer inline — cosmetic labeling drift, not an unresolved decision (see
Within-Artifact Issues).

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
- [VAGUE] All three `[OPEN: ...]` inline markers in the Consent Record
  section already state a resolved decision in the same sentence (e.g.
  "chosen for this plan as the simpler shape") — the `[OPEN:` tag reads
  as still-undecided even though the surrounding prose isn't. Consider
  switching these to the `**Resolved**:`-with-caveat phrasing the rest of
  the artifact set uses elsewhere, or leave as intentionally-revisitable
  markers — either way, non-blocking.

## Constitution Compliance

No violations found this pass. Principle VIII is **fully satisfied** —
the `.env`/`.env.example` key-parity lint runs pre-commit, and typecheck
+ the full test suite (minus e2e, deliberately deferred) run in CI on
every push/PR to `main` (`.github/workflows/ci.yml`).

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅ (Server node and the WebSocket edge
  label mention host removal. CI deliberately left off the container
  diagram — a build-time workflow, not a runtime component)
- ui.md — current ✅

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-07 (the one
outstanding entry, the `datamodel.md` percussion-detection claim, was
fixed on `fix-percussion-doc-drift` and marked resolved in `DEFECTS.md`;
a fresh full `/ardd-verify` pass would still be the authoritative
confirmation that nothing else has drifted since 2026-07-07).

## Feature Backlog

2 backlogged · 0 planned · 0 tasked · 12 implemented — see
`.project/features/`:
- `railway-terraform-deployment` (logged 2026-07-08): deploy the system
  to Railway with infrastructure defined and provisioned as Terraform
  code. Expect `infrastructure.md` to gain a Deployment section, and
  possibly a `constitution.md` touch on the Production Posture note.
- `catalog-activation-key-access` (logged 2026-07-08): private song
  catalogues on a public deployment, unlockable by a per-catalog
  activation key (a shared secret, not a per-user credential — this app
  has no auth); the host's unlocked catalogues are what session members
  see. A real design change to `datamodel.md`'s currently-single-global
  `CatalogSong[]` model — expect `datamodel.md`, `infrastructure.md`,
  and `ui.md` all affected, and likely overlap with the existing Song
  Consent Gate (public-deployment-only) and with
  `railway-terraform-deployment`.

Target either with `/ardd-plan <slug>` when ready to design.

## In Flight

Nothing in flight — no other worktrees, no draft PRs, `main` is pushed
and matches `origin/main`. Working tree clean except an untracked
`.project/.lock` (worth a manual look; not written/removed by this
pass).

## Recommended Next Step

1. Commit `.project/STATUS.md` and the two new feature files
   (`railway-terraform-deployment.md`, `catalog-activation-key-access.md`)
   — currently staged/untracked.
2. When ready, run `/ardd-plan <slug>` for either backlogged feature to
   design it — `railway-terraform-deployment` and
   `catalog-activation-key-access` likely overlap (both touch the public-
   deployment posture), so consider whether to plan them together or in
   sequence.
3. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `5fba0e5`).
4. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred — see `plan-github-actions-ci-workflow-2026-07-07.md`'s Open
   Questions).
5. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and the stale `[OPEN:` labeling
   in the Consent Record section.
