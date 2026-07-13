# sync-tab-scroll — Project Status

_Updated: 2026-07-12 (`/ardd-plan phase 1` drafted, approved, and tasked
**Accounts Phase 1** — OAuth identity + persisted catalogue unlock. Plan
`plan-accounts-phase-1-2026-07-12-e375.md` is `approved`; tasks file
`tasks-accounts-phase-1-02f7.md` is `ready` with 20 tasks across 7 phases.
Next: `/ardd-implement`.)_

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v1.5.0) | 0 |
| datamodel.md | stable ✅ | 0 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |

## Open Questions

None at the artifact level. The **accounts Phase 1 plan** carries two of its own
(non-blocking, resolved at implementation time):
- Ownership-bootstrap CLI representation — `CatalogueMembership(grantedVia:
  'owner')` vs. pulling a `CatalogueOwnership` table forward from Phase 2
  (plan Q1). datamodel.md labels `'owner'` as Phase 2, so the tension is real.
- Repository granularity — one `AccountStore` facade vs. three focused repos
  (plan Q2).

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts
  (pre-existing).
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (pre-existing).
- [MINOR] Feature register's pre-convention "Metronome/Count-in toggle"
  descriptions are superseded (pre-existing).

## Within-Artifact Issues

None. `lint-project.sh` is clean for all artifacts.

## Constitution Compliance

No violations. The accounts Phase 1 plan conforms to v1.5.0's additive posture
(DB optional, anonymous never gated), is test-first per Principle VII (Phase 7
deployment is operational and test-exempt), and uses named shared types
(Principle VI) and `.env`-based config (Principle VIII). The constitution
declares no simplicity/complexity-tracking or production-annotations principle,
so the plan omits those sections by design.

## Diagrams

All three renderables **current ✅** (README.md, re-rendered 2026-07-12 with the
accounts additions):
- datamodel.md — ERD includes `User`, `CatalogueMembership`, `AuthSession`,
  `Participant.userId`, and the Activation-Key `epoch`.
- infrastructure.md — container diagram includes the OAuth flow, cookie/WS
  identity, and the optional out-of-band Postgres.
- ui.md — component hierarchy includes the sign-in control + account menu.

_Phase 1 implementation adds no new entities beyond those already in the
datamodel ERD; the `AuthSession.id`-only cookie and `epoch` are already
reflected, so diagrams stay current through Phase 1._

## Code-vs-Artifact Defects

No defects — `DEFECTS.md` last checked 2026-07-10; artifacts match the codebase
as of the `song-select-unlock-guard` scoped re-verification. Run `/ardd-defects`
to refresh (recommended once Phase 1 code lands).

## Feature Backlog

14 implemented · 0 backlogged · 0 planned · 0 tasked — see `.project/features/`.
(Accounts Phase 1 is tracked as a design-of-record phase, not a register
feature, so it does not appear here.)

## Plans & Tasks

- **Accounts Phase 1** — `plan-accounts-phase-1-2026-07-12-e375.md` (`approved`),
  tasks `tasks-accounts-phase-1-02f7.md` (`ready`, 20 tasks / 7 phases). Ready
  for `/ardd-implement`.

## Recommended next step

Run `/ardd-implement` to execute `tasks-accounts-phase-1-02f7.md` (start with
Phase 1: the DB-optional repository foundation). ARDD is up to date.
