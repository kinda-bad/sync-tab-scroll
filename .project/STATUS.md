# sync-tab-scroll — Project Status

_Updated: 2026-07-12 (**Accounts Phase 1 shipped** — `/ardd-implement`
completed all 20 tasks of `tasks-accounts-phase-1-02f7.md` and merged into
`main` at `e2747b2` (fast-forward, 80 files, +3363/−69, all commits signed).
OAuth identity + optional Postgres + persisted catalogue unlock now live in
the codebase. Live Railway/secret deploy steps (T019/T020) still need the
operator.)_

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

None at the artifact level. The two plan-level open questions from Accounts
Phase 1 were resolved during implementation:
- Repository granularity → a single `AccountStore` facade (`server/src/accounts/`).
- Ownership-bootstrap representation → a `CatalogueMembership(grantedVia:'owner')`
  row via the `set-catalogue-owner` CLI (no `CatalogueOwnership` table yet;
  that remains a Phase 2 concern).

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts
  (pre-existing).
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (pre-existing).
- [MINOR] Feature register's pre-convention "Metronome/Count-in toggle"
  descriptions are superseded (pre-existing).

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. Accounts Phase 1 shipped test-first (Principle VII — 20/20 tasks
TDD, red-before-green); DB-optional/additive posture (v1.5.0) preserved (server
runs with no `DATABASE_URL`, anonymous path unchanged); named shared types
(Principle VI) and `.env`/`.env.example` parity (Principle VIII) extended for
the account layer. Adversarial resolutions S1–S8 all implemented (OAuth
state/PKCE/nonce, revocable `AuthSession`, WS `Origin` allowlist, re-lock on
host change, key-epoch revocation, fail-soft DB, stable-id membership keying).

## Diagrams

All three renderables **current ✅** (README.md). Phase 1 added no entities
beyond those already in the datamodel ERD (`User`, `CatalogueMembership`,
`AuthSession`, Activation-Key `epoch`), so no re-render is needed.

## Code-vs-Artifact Defects

`DEFECTS.md` last checked **2026-07-10** — now **stale**: Accounts Phase 1 added
~3,300 lines across `server/src/accounts/`, `server/src/auth/`,
`membership-unlock`, the client account UI, and infra Terraform since that pass.
**Run `/ardd-defects`** to verify the new code matches datamodel.md /
infrastructure.md / ui.md.

## Feature Backlog

14 implemented · 0 backlogged · 0 planned · 0 tasked — see `.project/features/`.
(Accounts Phase 1 is a design-of-record phase, not a register feature, so it
doesn't appear here.)

## Plans & Tasks

- **Accounts Phase 1** — `plan-accounts-phase-1-2026-07-12-e375.md` (`approved`),
  tasks `tasks-accounts-phase-1-02f7.md` (`completed`, 20/20). Merged to `main`
  at `e2747b2`.

## Operator follow-ups (live steps the worktree could not perform)

- **T019** — create the Railway Postgres service by hand (name it `Postgres`),
  `terraform apply`, verify the `${{Postgres.DATABASE_URL}}` reference resolves.
  In-repo Terraform (`infra/main.tf`, `prevent_destroy` guard) + runbook
  (`infra/README.md`) already landed.
- **T020** — register prod OAuth redirect URIs; push OAuth client id/secret +
  `SESSION_COOKIE_SECRET` as sealed Railway vars via
  `railway variables --set "…=$(op read op://sync-tab-scroll/…)"`; verify prod
  sign-in end-to-end.

## Recommended next step

Run **`/ardd-defects`** to verify the freshly-merged account code against the
artifacts, then perform the T019/T020 live deploy steps above to bring accounts
online in production. (Phase 2 — in-app authoring + dynamic catalog — remains
the next design-of-record milestone.)
