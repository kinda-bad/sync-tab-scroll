# sync-tab-scroll — Project Status

_Updated: 2026-07-13 (**Sign-out fix SHIPPED to `main`** —
`plan-signout-reload-race-2026-07-13-2e98.md` implemented via a delegated
worktree (test-first, Principle VII) and **fast-forward-merged into `main` at
`a683a97`** (4 signed commits). `signOut()` (`client/src/account.ts`) no longer
hard-reloads: on confirmed `res.ok` it flips `accountStore` to signed-out
in-memory (no reload race); on non-OK/thrown fetch it keeps the menu signed-in
and pushes a terse error toast — a failed logout is no longer masked as
success. Root cause was the trailing `window.location.reload()` racing/aborting
`/auth/logout` so its cookie-clear `Set-Cookie` never landed. `ui.md` States
documents the failure-surfacing decision. Tests: `account.test.ts` signOut
suite (3 cases, red-before-green), full client suite **75/0**, workspace
typechecks clean. **Note:** the fix is merged but **not yet deployed to prod**
— `main` on Railway is still `de20c5fa`; a redeploy is needed to close the live
bug. Also `ui.md`'s diagram is now **stale** (run `/ardd-diagram ui`). Consumed
the signout feedback → **0 open feedback**. Prior: **Prod deployed** — `main`
is live on Railway (`de20c5fa`, sts.ty-pe.com). Prior:
**reachable-account-controls SHIPPED**
— all 3 tasks
implemented in a delegated worktree and fast-forward-merged into `main` at
`318b7d2` (6 signed commits); UI diagram regenerated at `a6776c9`. `AccountMenu`
now renders on the Landing view too (identity + Sign out when signed-in, 'Sign
in' when signed-out), and `SongPartModal` is dismissible (× / backdrop / Escape,
auto-open-once then stays dismissed) so the persistent Bar stays reachable — no
z-index change, Modal.svelte untouched. Consumed the landing-signin +
bar-controls feedback. Tests: Landing account-menu CT (signed-in/out/unavailable)
+ song-part-modal e2e dismissal (7/7); workspace typechecks. All three diagrams
**current**. Note: e2e runs with no DB so AccountMenu renders nothing there —
the signed-in-Sign-out-on-Landing path is CT-covered only; the deferred browser
validation will cover it live. Prior: **Hide-locked-catalogues SHIPPED** —
merged at `a1e8446`; locked catalogues hidden, keyless `catalogue-unlock`,
`visibleCatalog` withholds locked metadata. Prior context:
**Accounts Phase 1 shipped** — `/ardd-implement`
completed all 20 tasks of `tasks-accounts-phase-1-02f7.md` and merged into
`main` at `e2747b2` (fast-forward, 80 files, +3363/−69, all commits signed).
OAuth identity + optional Postgres + persisted catalogue unlock now live in
the codebase. `/ardd-defects` then verified the merged account code against
every artifact — **no defects**. Live Railway/secret deploy steps (T019/T020)
still need the operator. **2026-07-13:** deployed to production — `main` pushed,
Postgres wired via Terraform, sealed OAuth/session vars pushed; only OAuth
redirect-URI registration + final verify remain. See Deploy status below.)_

> **ARDD update available:** installed `7c5dcd0`, latest release `v0.10.0` —
> run `/ardd-update`.

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

`ui.md` **stale ⚠️** (run `/ardd-diagram ui`) — the sign-out States bullet
(`a683a97`) edited the artifact and stamped its diagram stale.
`infrastructure.md` (`bd1c6a1`) and `datamodel.md` remain **current ✅**.

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

**None open.** `feedback-signout-reload-masks-failure-9a29.md` was consumed by
`plan-signout-reload-race-2026-07-13-2e98.md` (now `planned`).

Prior (all `planned`, shipped):
- `feedback-signout-reload-masks-failure-9a29.md` → `plan-signout-reload-race-…-2e98` (shipped to `main` `a683a97`; not yet deployed).
- `feedback-hide-locked-catalogues-69a3.md` → `plan-hide-locked-catalogues-…-6db8` (shipped `a1e8446`).
- `feedback-landing-signin-missing-2ebd.md` → `plan-reachable-account-controls-…-ca49` (shipped `318b7d2`).
- `feedback-bar-controls-blocked-by-modal-f0e8.md` → `plan-reachable-account-controls-…-ca49` (shipped `318b7d2`).

## Plans & Tasks

- **Sign-out reload race fix** — `plan-signout-reload-race-2026-07-13-2e98.md`
  (`approved`), tasks `tasks-signout-reload-race-e126.md` (`completed`, 3/3).
  **Merged to `main` at `a683a97`** (fast-forward, 4 signed commits) via a
  delegated worktree. Test-first (Principle VII): T001 failing `signOut` test
  (3 outcomes, red-before-green), T002 the `client/src/account.ts` fix
  (confirmed-OK → in-memory signed-out, no reload; failure → keep signed-in +
  terse error toast), T003 `ui.md` States note. Client suite 75/0, typechecks
  clean. **Not yet deployed** — Railway still runs `de20c5fa`; redeploy to
  close the live prod bug. `ui.md` diagram stale (run `/ardd-diagram ui`).
- **Reachable account controls** — `plan-reachable-account-controls-2026-07-13-ca49.md`
  (`approved`), tasks `tasks-reachable-account-controls-1787.md` (`completed`, 3/3).
  **Merged to `main` at `318b7d2`** (fast-forward, 6 signed commits). `AccountMenu`
  on Landing + dismissible `SongPartModal`; consumed landing-signin + bar-controls
  feedback. UI diagram regenerated (`a6776c9`). All test-first (Playwright); suites
  green, workspace typechecks.
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

Both feature plans are shipped to `main` AND deployed to production (Railway
`de20c5fa`, `● Online` at https://sts.ty-pe.com). During post-deploy browser
validation a **new prod bug** surfaced (open feedback, above): **Sign out on the
Landing page silently fails**. Remaining, in order:
1. **`/ardd-plan`** — consume the open sign-out feedback → fix
   `client/src/account.ts` `signOut` (don't fake success on a failed logout;
   surface/retry). Small; likely 1–2 tasks.
2. **Finish browser OAuth validation** — the redirect-URI registration checks
   (a ready-to-paste Chrome-extension prompt was drafted this session) are
   still worth running; the sign-out portion is now a known bug.

Note: several docs-only commits (feedback/status) are committed locally but
**not yet pushed** — batch them with the sign-out fix so `main` gets one deploy,
not several redundant Railway rebuilds.

After those, Phase 2 — in-app authoring + dynamic catalog — is the next
design-of-record milestone.
