# sync-tab-scroll — Project Status

_Updated: 2026-07-09 (`/ardd-analyze`, after `railway-terraform-deployment`
merged into `main`). Repo is on `main`. **Merge commit `b830366` is
unsigned** — 1Password was locked; re-sign before pushing (e.g. `git
commit --amend -S`). No cross-artifact contradictions found._

ARDD update available: installed `9189817`, source at `759e03f` — run
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
- `[OPEN: custom domain]` — the Railway-assigned `*.up.railway.app`
  domain is sufficient for now (and is what's actually provisioned by
  `infra/`'s `railway_service_domain` resource); a custom domain is
  deferred, not resolved by the now-implemented
  `railway-terraform-deployment` feature.

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
the `.env`/`.env.example` key-parity lint runs pre-commit, typecheck +
the full test suite (minus e2e, deliberately deferred) run in CI, and
the new `CLIENT_ROOT` env var was added to both `server/.env.example`
and `config.test.ts` alongside the code that reads it. The Deployment
section explicitly reconciles itself with Principle VIII rather than
conflicting (local `.env` governs dev/CI only; deployed env vars are
Terraform-managed, a distinct mechanism for a distinct environment).

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure` if
  desired — the Deployment section's Railway/Dockerfile/Terraform
  topology isn't reflected in the container diagram; not blocking, and
  arguably build/ops detail the diagram may not need at all)
- ui.md — current ✅

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-07. A fresh full
`/ardd-verify` pass would be worth running once `railway-terraform-deployment`
merges, given the volume of new server/client code this feature added.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 13 implemented — see
`.project/features/`:
- `railway-terraform-deployment` — **implemented**, merged into `main`.
  Same-origin WS client mode, server-serves-client-build static
  fallback, `Dockerfile`, `infra/`'s Terraform config, and deployment
  docs (`README.md`, `infra/README.md`).
- `catalog-activation-key-access` (logged 2026-07-08, still
  `backlogged`): private song catalogues on a public deployment,
  unlockable by a per-catalog activation key (a shared secret, not a
  per-user credential). A real design change to `datamodel.md`'s
  currently-single-global `CatalogSong[]` model — expect `datamodel.md`,
  `infrastructure.md`, and `ui.md` all affected, and likely overlap with
  the Song Consent Gate and the now-implemented Railway deployment (e.g.
  where the activation-key check would live in the deployed topology).

## In Flight

Nothing in flight — no other worktrees, no draft PRs. `railway-terraform-deployment`
has merged. Real Docker/Terraform verification was done this session
(Docker Desktop started locally, a real image built and run with a
bind-mounted catalog; Terraform installed via Homebrew, `terraform
validate` passed, `terraform plan` confirmed to fail only on a missing
`RAILWAY_TOKEN` — no real Railway resources were provisioned). Working
tree clean except an untracked `.project/.lock` (worth a manual look;
not written/removed by this pass).

## Recommended Next Step

1. Re-sign merge commit `b830366` once 1Password is unlocked (`git
   commit --amend -S`), then push `main`.
2. Once pushed, an operator can follow `README.md`'s "Deploying to
   Railway" section to actually provision the deployment (requires a
   Railway account/API token this session didn't have).
3. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `759e03f`).
4. When ready, run `/ardd-plan catalog-activation-key-access` to design
   the remaining backlogged feature.
5. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred — see `plan-github-actions-ci-workflow-2026-07-07.md`'s Open
   Questions).
6. Consider running `/ardd-verify` given the volume of new server/client
   code `railway-terraform-deployment` added.
7. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, the stale `[OPEN:` labeling in
   `datamodel.md`'s Consent Record section, and `infrastructure.md`'s
   stale container diagram.
