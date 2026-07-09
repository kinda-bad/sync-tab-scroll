# sync-tab-scroll — Project Status

_Updated: 2026-07-09 (`/ardd-analyze`, after `/ardd-tasks` approved
`plan-railway-terraform-deployment-2026-07-09.md` and generated
`tasks-railway-terraform-deployment-30b0.md` on branch
`railway-terraform-deployment`). `main` is pushed and matches
`origin/main` as of the last session. No cross-artifact contradictions
found._

ARDD update available: installed `9189817`, source at `5fba0e5` — run
`/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 4 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | draft ⚠️ | 1 |
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

### infrastructure.md
- `[OPEN: custom domain]` (new, `railway-terraform-deployment` plan) —
  the Railway-assigned `*.up.railway.app` domain is sufficient for now;
  a custom domain is deferred, not resolved by this plan.

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

### infrastructure.md
- [OPEN] Custom domain (see above) — genuinely deferred, not a labeling
  quirk like `datamodel.md`'s.

## Constitution Compliance

No violations found this pass. Principle VIII is **fully satisfied** —
the `.env`/`.env.example` key-parity lint runs pre-commit, and typecheck
+ the full test suite (minus e2e, deliberately deferred) run in CI on
every push/PR to `main` (`.github/workflows/ci.yml`). The new Deployment
section explicitly reconciles itself with Principle VIII rather than
conflicting (local `.env` governs dev/CI only; deployed env vars are
Terraform-managed, a distinct mechanism for a distinct environment).

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure` if
  desired — the new Deployment section's Railway/Dockerfile/Terraform
  topology isn't reflected in the container diagram; not blocking, and
  arguably build/ops detail the diagram may not need at all)
- ui.md — current ✅

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-07. A fresh full
`/ardd-verify` pass would still be the authoritative confirmation that
nothing has drifted since then.

## Feature Backlog

1 backlogged · 0 planned · 1 tasked · 12 implemented — see
`.project/features/`:
- `railway-terraform-deployment` — **tasked**. Design applied
  (`infrastructure.md`'s Deployment section), plan approved
  (`plan-railway-terraform-deployment-2026-07-09.md`), tasks generated
  (`tasks-railway-terraform-deployment-30b0.md`, `status: ready`, 0/12).
  Next step is `/ardd-implement`.
- `catalog-activation-key-access` (logged 2026-07-08, still
  `backlogged`): private song catalogues on a public deployment,
  unlockable by a per-catalog activation key (a shared secret, not a
  per-user credential). A real design change to `datamodel.md`'s
  currently-single-global `CatalogSong[]` model — expect `datamodel.md`,
  `infrastructure.md`, and `ui.md` all affected, and likely overlap with
  the Song Consent Gate and the now-designed Railway deployment (e.g.
  where the activation-key check would live in the deployed topology).

## In Flight

Branch `railway-terraform-deployment` (current checkout, not a separate
worktree) — `tasks-railway-terraform-deployment-30b0.md` at
`status: ready`, 0/12 complete. 5 phases: same-origin WS client, server
serves the client build, Dockerfile, Terraform config (`infra/`),
documentation. Explicitly does **not** include running `terraform
apply` — that's scoped as a manual operator step, never an automated
task (T010 stops at `terraform validate`/`plan`). Also untracked:
`.project/.lock` (worth a manual look; not written/removed by this
pass).

## Recommended Next Step

1. Run `/ardd-implement` to execute
   `tasks-railway-terraform-deployment-30b0.md` (12 tasks, all on
   `railway-terraform-deployment`). Note T010 needs a Railway API token
   to run a real `terraform plan`; without one it falls back to
   `terraform validate` plus a manual structural read-through.
2. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `5fba0e5`).
3. When ready, run `/ardd-plan catalog-activation-key-access` — consider
   doing this after (not concurrently with) the Railway work, since the
   two likely interact.
4. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred — see `plan-github-actions-ci-workflow-2026-07-07.md`'s Open
   Questions).
5. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, and the stale `[OPEN:` labeling
   in `datamodel.md`'s Consent Record section.
