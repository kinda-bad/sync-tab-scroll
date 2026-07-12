# sync-tab-scroll — Project Status

_Updated: 2026-07-12 (`/ardd-refine ui` added the optional Account & Sign-In
layer. The accounts design is now propagated across **all four** core artifacts
— constitution, datamodel, infrastructure, ui. Only diagram re-renders remain
before `/ardd-plan` Phase 1.)_

ARDD update available: installed `9189817`, source at `a4f7f9c` — run
`/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v1.5.0) | 0 |
| datamodel.md | stable ✅ | 0 (diagram stale) |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 (diagram stale) |
| ui.md | stable ✅ | 0 (diagram stale) |
| brand.md | stable ✅ | 0 |

## Open Questions

None. Every accounts design decision (design-of-record
`.project/design-user-accounts-2026-07-12.reviewed.md` §12 + §13) is now written
into constitution + datamodel + infrastructure + ui.

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts
  (pre-existing).
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (pre-existing).
- [MINOR] Feature register's pre-convention "Metronome/Count-in toggle"
  descriptions are superseded (pre-existing).

(The prior "ui lacks a login entry" gap is now closed by the Account & Sign-In
section.)

## Within-Artifact Issues

None. `lint-project.sh` is clean for all four accounts artifacts; the
pre-existing `tasks-lyrics-ticker` / `tasks-settings-modal-followup` /
`feedback-manual-verification-pass` status warnings are unrelated.

## Constitution Compliance

No violations. Accounts artifacts conform to v1.5.0's additive posture (DB
optional, anonymous never gated) and Principles I/VI.

## Diagrams

All three renderables **current ✅** — re-rendered into `README.md` on
2026-07-12 with the accounts additions:
- datamodel.md — ERD now includes `User`, `CatalogueMembership`, `AuthSession`,
  `Participant.userId`, and the Activation-Key `epoch`.
- infrastructure.md — container diagram now includes the OAuth flow, cookie/WS
  identity, and the optional out-of-band Postgres.
- ui.md — component hierarchy now includes the sign-in control + account menu.

## Code-vs-Artifact Defects

**0 known defects** — `DEFECTS.md` all-clear, last checked 2026-07-10. The
account entities/flows/UI are design-only; no code exists yet, so no drift.

## Feedback

No open feedback.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 14 implemented. The accounts feature
enters the register when `/ardd-plan` scopes Phase 1.

## In Flight

**User-accounts feature — design complete across all core artifacts.**
Committed so far: constitution v1.5.0 (`48b8d59`), datamodel (`fb5e4d1`).
Uncommitted: the constitution Sync-Impact reorder, infrastructure, ui, STATUS.
Design-of-record + full review trail in `.project/design-user-accounts-*` /
`spike-datastore-secrets-*`. No worktrees, no draft PRs.

## Recommended Next Step

Design is complete and diagrams are current. **`/ardd-plan` for Phase 1**
(accounts + persisted unlock + minimal ownership-bootstrap CLI) →
`/ardd-tasks` → `/ardd-implement`. Note the operator prerequisites Phase 1
surfaces (register Google/GitHub OAuth apps; create the Railway Postgres
service by hand + wire `DATABASE_URL` reference + sealed secrets — spike doc)
before the implemented auth can run against real providers.
