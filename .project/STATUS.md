# sync-tab-scroll — Project Status

_Updated: 2026-07-12 (`/ardd-analyze` after `/ardd-refine datamodel` added the
durable account layer — `User`, `CatalogueMembership`, `AuthSession` — per the
accounts design-of-record. `constitution` (v1.5.0) and `datamodel` now describe
the accounts direction; `infrastructure` is the remaining artifact to catch
up.)_

ARDD update available: installed `9189817`, source at `a4f7f9c` — run
`/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v1.5.0) | 0 |
| datamodel.md | stable ✅ | 0 (account layer added; diagram stale) |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 (accounts/OAuth/DB pending refine) |
| ui.md | stable ✅ | 0 (login entry point pending) |
| brand.md | stable ✅ | 0 |

## Open Questions

None as `[OPEN:` markers. Accounts design decisions are all resolved in the
design-of-record (`.project/design-user-accounts-2026-07-12.reviewed.md`); they
are now propagated into `constitution` + `datamodel`, with `infrastructure`
(and a small `ui` login entry) still to go.

## Cross-Artifact Issues

- [GAP — expected/in-progress] `datamodel.md` now references `infrastructure.md`
  for the accounts mechanics it introduced — the OAuth flow, the cookie/WS
  identity + `AuthSession` revocation check, the host-succession re-derive of
  `unlockedCatalogueIds`, DB-optional boot, and out-of-band Postgres. Those
  don't exist in `infrastructure.md` yet: **`/ardd-refine infrastructure` is
  the next step.** Not a contradiction — a pending propagation.
- [GAP — expected] `ui.md` will need a login/account entry point (a
  Sign-in-with-Google/GitHub affordance that never gates the anonymous path) —
  small, likely alongside or after the infrastructure refine.
- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts.
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`.
- [MINOR] Feature register's pre-convention "Metronome/Count-in toggle"
  descriptions are superseded.

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. `datamodel`'s account layer conforms to v1.5.0's additive posture
(DB optional, anonymous preserved) and to Principle VI (named entities, single
source of truth).

## Diagrams

- **datamodel.md — stale ⚠️** (run `/ardd-render datamodel`) — the ERD needs
  `User`, `CatalogueMembership`, `AuthSession` and the `Participant.userId` /
  Activation-Key `epoch` additions. Worth deferring the render until
  `infrastructure` is also refined, then re-render in one pass.
- infrastructure.md — current ✅ (will go stale at its refine)
- ui.md — current ✅

## Code-vs-Artifact Defects

**0 known defects** — `DEFECTS.md` all-clear, last checked 2026-07-10. (These
account entities are design-only; no code exists for them yet, so they are not
a code-vs-artifact drift.)

## Feedback

No open feedback.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 14 implemented. The accounts feature
enters the register when `/ardd-plan` scopes Phase 1.

## In Flight

**User-accounts feature — in design.** Propagated so far: `constitution`
(v1.5.0, committed `48b8d59`) and `datamodel` (account layer, uncommitted).
Design-of-record + full review trail in `.project/design-user-accounts-*` and
`spike-datastore-secrets-*`. Next: `infrastructure`, small `ui` login entry,
then `/ardd-plan` Phase 1. No worktrees, no draft PRs.

Working tree: `datamodel.md` + `STATUS.md` modified, uncommitted on `main`.

## Recommended Next Step

`/ardd-refine infrastructure` — add: the OAuth Authorization-Code flow
(`state`/PKCE) on the existing `http.Server`; the HTTP-only cookie →
`AuthSession` identity read on the WS upgrade **with an `Origin` allowlist
check**; out-of-band Railway Postgres + `DATABASE_URL` reference variable +
sealed OAuth/session secrets (never in tfstate); **DB-optional boot** (auth
self-disables); and the **re-derive-`unlockedCatalogueIds`-on-host-change**
behavior. Then a small `ui` login-entry refine, then `/ardd-plan` Phase 1.
Consider committing the `datamodel` refine first.
