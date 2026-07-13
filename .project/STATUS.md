# sync-tab-scroll — Project Status

_Updated: 2026-07-13 (**Hide-locked-catalogues SHIPPED** — all 5 tasks of
`tasks-hide-locked-catalogues-6009.md` implemented in a delegated worktree and
fast-forward-merged into `main` at `a1e8446` (6 signed commits). Locked private
catalogues no longer appear in the song picker; the host unlocks via one
standalone key control; `catalogue-unlock` dropped `catalogueId` (server now
resolves the key across all locked catalogues) and `visibleCatalog` withholds
locked catalogue metadata entirely. Revised `ui.md` + `infrastructure.md` (both
now have **stale diagrams** — run `/ardd-diagram`). Suites green: 175 server,
93 CT, 72 client; workspace typechecks. **2 open feedback files remain**
(bar-controls-blocked-by-modal, landing-signin-missing) for the next
`/ardd-plan`. Prior context:
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

- `datamodel.md` — **current ✅** (README.md); hide-locked-catalogues added no
  entities.
- `infrastructure.md` — **stale ⚠️** (run `/ardd-diagram infrastructure`) — the
  `catalogue-unlock` protocol changed (keyless message, server-side key
  resolution).
- `ui.md` — **stale ⚠️** (run `/ardd-diagram ui`) — the song-picker /
  catalogue-unlock flow changed (locked catalogues hidden, standalone key
  control).

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

**2 open feedback files** — will be picked up by the next `/ardd-plan`:
- `feedback-landing-signin-missing-2ebd.md` (Reconsidered, `[artifacts: ui]`):
  account controls should be on the create/join (Landing) page in both states —
  sign-in when signed-out (already there) and identity + sign-out when signed-in
  (missing; the account menu is Bar-only per ui.md:50–54). Reverses that
  placement decision.
- `feedback-bar-controls-blocked-by-modal-f0e8.md` (open; not filed this
  session).

`feedback-hide-locked-catalogues-69a3.md` is `planned` (consumed by
`plan-hide-locked-catalogues-2026-07-13-6db8.md`).

## Plans & Tasks

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

Hide-locked-catalogues is shipped. Open threads, in rough priority:
1. **`/ardd-diagram ui` + `/ardd-diagram infrastructure`** — both diagrams went
   stale from this change (quick, deterministic).
2. **`/ardd-plan`** — consume the 2 open feedback files (Landing account
   controls + bar-controls-blocked-by-modal).
3. **Deploy operator step** — **register the two OAuth redirect URIs** in the
   Google + GitHub dashboards (see Deploy status above), then verify sign-in.
   (Note: the landing-signin feedback may resolve once accounts are verified
   working on prod.)

After those, Phase 2 — in-app authoring + dynamic catalog — is the next
design-of-record milestone.
