# sync-tab-scroll — Project Status

_Updated: 2026-07-09 (`/ardd-analyze`, after `/ardd-plan
catalog-activation-key-access` drafted
`plan-catalog-activation-key-access-2026-07-09.md` on branch
`catalog-activation-key-access`). `main` still has 2 unsigned commits
(the `railway-terraform-deployment` merge and its STATUS.md follow-up)
awaiting re-signing/push from the prior session — unrelated to this
branch. No cross-artifact contradictions found._

ARDD update available: installed `9189817`, source at `314183a` — run
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
Within-Artifact Issues). Unrelated to and untouched by this session's
`catalog-activation-key-access` design work.

### infrastructure.md
- `[OPEN: custom domain]` — the Railway-assigned `*.up.railway.app`
  domain is sufficient for now; a custom domain is deferred, not
  resolved by `railway-terraform-deployment`. Unrelated to this
  session's `catalog-activation-key-access` design work.

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

No violations found this pass. `catalog-activation-key-access`'s design
follows Principle V (Node's built-in `crypto` module for key hashing, no
new dependency) and Principle II (`create-catalogue` mirrors
`record-consent`'s existing CLI shape rather than introducing a new
mechanism). Principle VIII remains fully satisfied — no new local `.env`
keys were introduced by this session's design work.

## Diagrams

- datamodel.md — stale ⚠️ (new `Catalogue` entity + `CatalogSong.catalogueId`
  + `Session.unlockedCatalogueIds`, not yet reflected in the ERD)
- infrastructure.md — stale ⚠️ (Railway/Dockerfile/Terraform topology
  from `railway-terraform-deployment`, not reflected in the container
  diagram; not blocking)
- ui.md — stale ⚠️ (new catalogue-grouped picker + host-only unlock
  control, not yet reflected in the component hierarchy)

All three are design-only right now — `catalog-activation-key-access` is
still a `draft`-status plan, nothing implemented yet. Re-render once
implementation lands rather than now, to avoid re-rendering twice.

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-07. A fresh full
`/ardd-verify` pass would be worth running given the volume of new
server/client code `railway-terraform-deployment` added, before this
session's `catalog-activation-key-access` implementation adds more.

## Feature Backlog

0 backlogged · 1 planned · 0 tasked · 13 implemented — see
`.project/features/`:
- `catalog-activation-key-access` — design applied this session
  (`Catalogue`/`unlockedCatalogueIds`/`catalogue-unlock`/`create-catalogue`
  across `datamodel.md`, `infrastructure.md`, `pipeline.md`, `ui.md`);
  plan drafted at `plan-catalog-activation-key-access-2026-07-09.md`,
  `status: draft`. Still `backlogged` in the register (the flip to
  `planned` happens at `/ardd-tasks` time, not `/ardd-plan` time).
- `railway-terraform-deployment` — **implemented**, merged into `main`
  (prior session).

## In Flight

Branch `catalog-activation-key-access` (current checkout, not a
separate worktree) — `plan-catalog-activation-key-access-2026-07-09.md`
at `status: draft`, not yet selected by `/ardd-tasks`. 5 phases / 11
tasks: catalogue loading, `create-catalogue` CLI, session-aware catalog
delivery, `catalogue-unlock` handler, UI. Also untracked:
`.project/.lock` (worth a manual look; not written/removed by this
pass).

Separately, `main` still carries 2 unsigned commits from the prior
session (`railway-terraform-deployment`'s merge `b830366` and its
`STATUS.md` follow-up `54a99a4`) — not pushed yet, unrelated to this
branch's work.

## Recommended Next Step

1. Run `/ardd-tasks` to select
   `plan-catalog-activation-key-access-2026-07-09.md` (flips it to
   `approved`, flips `catalog-activation-key-access` to `tasked`), then
   `/ardd-implement`.
2. Separately: re-sign `main`'s 2 unsigned commits once 1Password is
   unlocked, then push.
3. Optional: run `/ardd-update` — a newer ARDD tooling commit is
   available (installed `9189817`, source at `314183a`).
4. Consider running `/ardd-verify` given the volume of code
   `railway-terraform-deployment` added, before more implementation
   lands on top of it.
5. Consider a follow-up plan for e2e tests in CI, once the current
   typecheck+CT+vitest jobs have proven stable for a while (deliberately
   deferred — see `plan-github-actions-ci-workflow-2026-07-07.md`'s Open
   Questions).
6. Not blocking: the `connectionStatus` naming overlap, the missing
   `installCountInCursorGuard` mention, the stale `[OPEN:` labeling in
   `datamodel.md`'s Consent Record section, and the three stale
   diagrams (datamodel/infrastructure/ui) — worth a single
   `/ardd-render` pass once `catalog-activation-key-access` implements.
