# sync-tab-scroll — Project Status

_Updated: 2026-07-13 (**reachable-account-controls planned & tasked** — the two
open feedback items (landing-signin-missing, Reconsidered; bar-controls-blocked-
by-modal) became an approved plan
(`plan-reachable-account-controls-2026-07-13-ca49.md`) with a `ready` tasks file
(`tasks-reachable-account-controls-1787.md`, 3 tasks): revise `ui.md` (T001),
then two parallel client tasks — reuse `AccountMenu` on the Landing view (T002)
and make `SongPartModal` dismissible with an auto-open-once/stay-dismissed flag
(T003). User decisions: Landing reuses the existing AccountMenu; the
bar-controls fix is dismissibility, NOT a z-index override (Modal already
dismisses on ×/backdrop/Escape). Committed to `main` at `1618a45`; **ready for
`/ardd-implement`**. Prior: **Hide-locked-catalogues SHIPPED** — all 5 tasks
merged into `main` at `a1e8446` (6 signed commits); locked catalogues hidden,
keyless `catalogue-unlock`, `visibleCatalog` withholds locked metadata; ui.md +
infrastructure.md diagrams regenerated (both **current** now). Suites green.
Prior context:
**Accounts Phase 1 shipped** — `/ardd-implement`
completed all 20 tasks of `tasks-accounts-phase-1-02f7.md` and merged into
`main` at `e2747b2` (fast-forward, 80 files, +3363/−69, all commits signed).
OAuth identity + optional Postgres + persisted catalogue unlock now live in
the codebase. `/ardd-defects` then verified the merged account code against
every artifact — **no defects**. Live Railway/secret deploy steps (T019/T020)
still need the operator. **2026-07-13:** deployed to production — `main` pushed,
Postgres wired via Terraform, sealed OAuth/session vars pushed; only OAuth
redirect-URI registration + final verify remain. See Deploy status below.)_

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

All three renderables **current ✅** (README.md). `ui.md` and
`infrastructure.md` were regenerated after hide-locked-catalogues (commits
`9443237`, `bd1c6a1`); `datamodel.md` unchanged. Note: the approved
`reachable-account-controls` plan's T001 will re-stale `ui.md` once
implemented — run `/ardd-diagram ui` again after that lands.

## Code-vs-Artifact Defects

**No defects** — `DEFECTS.md` last checked **2026-07-12**. A focused
`/ardd-defects` pass over the freshly-merged Accounts Phase 1 layer (~3,300
lines) confirmed the account code matches datamodel.md, infrastructure.md,
ui.md, pipeline.md, and constitution Principles I/II/VI/VII/VIII — all
adversarial resolutions S1–S8 verified present in the implementation. The
pre-accounts codebase (clean at 2026-07-10) is unchanged except for additive
account wiring.

## Feature Backlog

14 implemented · 0 backlogged · 0 planned · 0 tasked — see `.project/features/`.
(Accounts Phase 1 is a design-of-record phase, not a register feature, so it
doesn't appear here.)

## Feedback

None open. All three feedback files are `planned`:
- `feedback-hide-locked-catalogues-69a3.md` → `plan-hide-locked-catalogues-…-6db8` (shipped).
- `feedback-landing-signin-missing-2ebd.md` → `plan-reachable-account-controls-…-ca49`.
- `feedback-bar-controls-blocked-by-modal-f0e8.md` → `plan-reachable-account-controls-…-ca49`.

## Plans & Tasks

- **Reachable account controls** — `plan-reachable-account-controls-2026-07-13-ca49.md`
  (`approved`), tasks `tasks-reachable-account-controls-1787.md` (`ready`, 0/3).
  Consumes landing-signin + bar-controls feedback. T001 revises `ui.md`
  (account controls on Landing; dismissible SongPartModal); T002 reuses
  `AccountMenu` on `Landing.svelte`; T003 makes `SongPartModal` dismissible in
  `App.svelte` (auto-open-once/stay-dismissed flag). T002/T003 parallel (different
  files); all test-first (Playwright). Committed to `main` at `1618a45`.
  **Next: `/ardd-implement`.**
- **Hide locked catalogues** — `plan-hide-locked-catalogues-2026-07-13-6db8.md`
  (`approved`), tasks `tasks-hide-locked-catalogues-6009.md` (`completed`, 5/5).
  **Merged to `main` at `a1e8446`** (fast-forward, 6 signed commits). Locked
  catalogues hidden from the picker; standalone host-only key control; keyless
  `catalogue-unlock` with server-side key resolution; `visibleCatalog` withholds
  locked metadata. All test-first (Principle VII); suites green (175 server, 93
  CT, 72 client). Follow-up: `ui.md`/`infrastructure.md` diagrams are stale
  (run `/ardd-diagram`).
- **Accounts Phase 1** — `plan-accounts-phase-1-2026-07-12-e375.md` (`approved`),
  tasks `tasks-accounts-phase-1-02f7.md` (`completed`, 20/20). Merged to `main`
  at `e2747b2`.

## Deploy status (Accounts Phase 1 → production, 2026-07-13)

Canonical public domain: **https://sts.ty-pe.com** (custom domain; the
Railway-assigned `sync-tab-scroll.up.railway.app` also resolves).

- **T019 — done.** Postgres created by hand; `terraform apply` wired
  `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (resolves to
  `postgres.railway.internal:5432`); `prevent_destroy` guard active. `/me`
  returns `{"accountsEnabled":true,...}` on both domains.
- **T020 — mostly done.** Sealed vars pushed from 1Password:
  `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `GITHUB_OAUTH_CLIENT_ID/SECRET`,
  `SESSION_COOKIE_SECRET` (newly generated + stored in the vault), and
  `PUBLIC_BASE_URL=https://sts.ty-pe.com`. Login redirects now carry the correct
  prod `redirect_uri`.
- **Remaining (operator-only):**
  1. Register the redirect URIs in the provider dashboards —
     GitHub OAuth app `Ov23liE98uUnST7Ycht7` → `https://sts.ty-pe.com/auth/github/callback`;
     Google client `607753971873-…` → `https://sts.ty-pe.com/auth/google/callback`.
  2. Verify sign-in end-to-end (both providers), a key-unlock persists across
     sessions, and the anonymous path still serves.
- **Cleanup (optional):** the legacy mis-named `GOOGLE_CLIENT_ID` /
  `GITHUB_CLIENT_ID` Railway vars are inert (the code reads the `_OAUTH_` names)
  and can be deleted.

## Recommended next step

1. **`/ardd-implement`** — the `reachable-account-controls` tasks file is
   `ready` (3 tasks: Landing AccountMenu + dismissible SongPartModal). After it
   lands, run **`/ardd-diagram ui`** (T001 re-stales the UI diagram).
2. **Deploy operator step** — **register the two OAuth redirect URIs** in the
   Google + GitHub dashboards (see Deploy status above), then verify sign-in.

After those, Phase 2 — in-app authoring + dynamic catalog — is the next
design-of-record milestone.
