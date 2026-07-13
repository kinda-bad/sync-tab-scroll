---
plan: plan-accounts-phase-1-2026-07-12-e375.md
generated: 2026-07-12
status: in-progress
---

# Tasks — Accounts Phase 1: OAuth Identity + Persisted Catalogue Unlock

Test-first per constitution Principle VII: every code task writes a failing
test before implementation. Phase 7 (deployment) is operational and
test-exempt. Adversarial resolutions S1–S8 (design §13) are cited on the tasks
that carry them.

## Phase 1: Durable store foundation (DB-optional)

- [x] T001 [artifacts: constitution, infrastructure] Add `.env` / `.env.example`
  config surface for the account layer per Principle VIII: `DATABASE_URL` plus
  placeholder keys for each OAuth provider's client id/secret
  (`GOOGLE_OAUTH_CLIENT_ID/SECRET`, `GITHUB_OAUTH_CLIENT_ID/SECRET`) and a
  session/cookie signing secret — real values never committed, `.env.example`
  holds placeholders. Extend the existing key-shape lint check to cover the new
  keys. Test: lint fails when a key exists in one file and is missing from the
  other. [parallel]
- [ ] T002 [artifacts: datamodel] Define named, exported shared TypeScript types
  (Principle VI) for `User`, `CatalogueMembership`, `AuthSession` in
  `packages/shared`, matching datamodel.md's Account Layer fields exactly —
  including the `oauthProvider`/`grantedVia` unions, `keyEpoch: number | null`,
  `email: string | null`, and `revokedAt: number | null`. Test: compile-time
  type assertions pin the field shapes. [parallel]
- [ ] T003 [artifacts: datamodel, infrastructure] Define the account repository
  interface (`AccountStore` facade or `UserRepo`/`MembershipRepo`/
  `AuthSessionRepo` — decide per plan Open Question 2) and a **null/absent**
  implementation selected when `DATABASE_URL` is unset. Test: the factory
  returns the null impl with no `DATABASE_URL`; null-impl reads return
  empty/anonymous and writes are no-ops (this is the seam that makes the
  DB-optional guarantee fall out of normal code paths, infrastructure.md).
- [ ] T004 [artifacts: datamodel] Write the Postgres schema + migrations matching
  datamodel.md and its Indexes section: `User` unique on
  `(oauthProvider, oauthSubject)`; `CatalogueMembership` keyed on the catalogue's
  **stable id** as a plain string with a `keyEpoch` column (S8), index on
  `userId`, unique `(userId, catalogueId)`; `AuthSession` primary key `id`, index
  on `userId`. No cross-store FK on `catalogueId`. Test: migration applies
  cleanly and the constraints/indexes exist.
- [ ] T005 [artifacts: infrastructure] Add a containerized-Postgres test harness
  (podman preferred, docker fallback — design §12.3) that starts a throwaway
  Postgres, applies migrations, and tears down; wire it into vitest setup and
  CI. Test: the harness brings a DB up and a trivial query succeeds.
- [ ] T006 [artifacts: datamodel] Implement the Postgres repository against the
  T003 interface: `User` upsert-by-`(oauthProvider, oauthSubject)`,
  `CatalogueMembership` create/query-by-`userId`/query-by-`(userId, stableId)`,
  `AuthSession` create/lookup-by-`id`/revoke. Test (against the T005 harness):
  CRUD round-trips and the unique constraints reject duplicates.

## Phase 2: OAuth flow + revocable cookie sessions

- [ ] T007 [artifacts: infrastructure] Implement provider-agnostic
  Authorization-Code helpers: generate + validate `state`, PKCE
  (verifier/challenge), and `nonce` (S1). Test: a well-formed state/PKCE/nonce
  round-trip validates; a tampered or missing `state`/`nonce`/verifier is
  rejected.
- [ ] T008 [artifacts: infrastructure, datamodel] Mount `/auth/<provider>/login`,
  `/auth/<provider>/callback`, `/auth/logout`, `/me` on the shared
  `http.createServer` **ahead of** the catalog/static/404 chain, for Google +
  GitHub: `login` redirects to the provider consent screen with the T007
  parameters; `callback` validates them, exchanges code→profile (provider token
  used once then discarded, design §3), upserts `User`, creates an `AuthSession`,
  and sets an **HTTP-only `Secure` `SameSite=Lax`** cookie carrying only
  `AuthSession.id` (S2); `logout` sets `revokedAt` and clears the cookie; `/me`
  resolves cookie→`AuthSession`→`User` (rejecting expired/`revokedAt`) or returns
  anonymous. When the null repo is active (no DB), every route is inert
  (unavailable/404). Test: full flow against a mock provider; revoked/expired
  session ⇒ `/me` anonymous; no-DB ⇒ all routes inert.
- [ ] T009 [artifacts: infrastructure] Extend Vite's dev proxy to forward
  `/auth/*` and `/me` to the backend so the OAuth redirect dance is same-origin
  in dev (design §6 dev-mode wrinkle). Test: the dev-proxy config routes those
  paths to the backend port.

## Phase 3: WS-upgrade hardening + connection identity

- [ ] T010 [artifacts: infrastructure] Add `Origin`-allowlist validation to the
  WebSocket upgrade handler (`server/src/server.ts`), rejecting disallowed
  origins **before** any cookie is read (S3) — `SameSite` is not the sole CSRF
  defense. Test: an allowed origin upgrades; a disallowed origin is rejected.
- [ ] T011 [artifacts: infrastructure, datamodel] After the Origin check, resolve
  the request cookie → `AuthSession` (reject expired/`revokedAt`) → stamp
  `userId` (or null) onto the `ConnectionRegistry` entry at attach time; this is
  the single cookie→session→`userId` resolution seam (infrastructure.md
  Production Posture). Participant/host reclaim stays keyed on `participantId`
  only — an auth cookie alone never reclaims a seat. A mid-run DB failure ⇒ treat
  the connection as anonymous, no crash (S7). Test: authenticated socket carries
  its `userId`; revoked/expired ⇒ anonymous; auth cookie alone does not reclaim a
  seat; DB error during resolution ⇒ anonymous, no throw.

## Phase 4: Activation-key epoch + persisted unlock

- [ ] T012 [artifacts: datamodel, pipeline] Add the `epoch` field to
  `catalogue.json` (datamodel.md Catalogue Activation Key), read by
  `catalog-loader.ts` with absent ⇒ treated as `1`; extend the `create-catalogue`
  pipeline CLI to write `epoch` on creation and bump it on key rotation
  (regenerating `salt`/`hash`). Test: loader defaults a missing `epoch` to 1; the
  CLI writes epoch on create and increments it on rotation.
- [ ] T013 [artifacts: infrastructure, datamodel] On a correct `catalogue-unlock`
  from a logged-in host (connection carries `userId` from T011, read from the
  registry — not re-resolved), best-effort write a
  `CatalogueMembership(grantedVia:'key', keyEpoch = catalogue's current epoch)`
  keyed on the catalogue's stable id (S5, S8). Anonymous host: unchanged,
  per-session only. If the store is unavailable the unlock still succeeds for the
  session and the write is skipped (S7). Test: signed-in host key-unlock persists
  a membership at the current epoch; anonymous persists nothing; DB-down still
  unlocks the live session.

## Phase 5: Host-only auto-unlock + re-lock on host change

- [ ] T014 [artifacts: infrastructure, datamodel] On `session-create` /
  `session-join`, union the **host's** epoch-current `CatalogueMembership`s into
  `Session.unlockedCatalogueIds` (skip any whose `keyEpoch` is below the
  catalogue's current epoch, S5), then emit the existing `session-state` +
  `catalog` re-broadcast pair `catalogue-unlock` already uses. Non-host
  authenticated participants do **not** cause unlock (host-only, design §12.1).
  Test: a signed-in host with a prior current-epoch membership auto-unlocks on
  join; a stale-epoch membership does not; a non-host's membership does not.
- [ ] T015 [artifacts: infrastructure] On host change — succession (Host
  Succession) and explicit Host Transfer — re-derive the membership-derived slice
  of `Session.unlockedCatalogueIds` from the *new* host's memberships rather than
  leaving the set intact (S4); catalogues unlocked by a key typed this session
  persist (session facts, tied to no user); with no DB this recomputation is a
  no-op. Test: succession to a non-member re-locks a membership-only catalogue
  while a key-typed catalogue stays unlocked.

## Phase 6: Client sign-in UI + ownership-bootstrap CLI

- [ ] T016 [artifacts: ui] Add the sign-in affordances (ui.md Account &
  Sign-In): a subordinate "Sign in with Google / GitHub" control on the Landing
  chooser and a persistent account menu in the Lobby/Playback bar (display name +
  Sign out when signed in; a compact "Sign in" link when signed out); wire `/me`
  on load; the OAuth return is handled by the existing Landing refresh-rejoin
  path (no special mid-session handling). When accounts are unavailable (no DB),
  the affordances are simply **absent**. Test (Playwright): signed-out shows
  "Sign in"; after a mock sign-in the menu shows the display name + Sign out;
  accounts-unavailable ⇒ affordances absent. [parallel]
- [ ] T017 [artifacts: ui] In the Lobby song picker, render a private catalogue
  the signed-in host is already a member of as **pre-unlocked** — its songs list
  directly with no "Enter activation key" prompt (ui.md). Test (Playwright): a
  member catalogue lists its songs without showing the activation-key prompt.
- [ ] T018 [artifacts: datamodel, infrastructure] Add a minimal
  ownership-bootstrap CLI (`set-catalogue-owner <catalogue-stable-id>
  <user-email | provider:subject>`) that grants the named account a
  `CatalogueMembership(grantedVia:'owner')` for an existing filesystem catalogue
  such as `kinda-bad` (design §12.2; no separate `CatalogueOwnership` table in
  Phase 1 — plan Open Question 1). Test: the CLI writes an owner membership and
  that account then auto-unlocks `kinda-bad` on join with no key entry.

## Phase 7: Railway deployment (operational, test-exempt)

- [ ] T019 [artifacts: infrastructure] Create the Railway Postgres service by
  hand in the dashboard (community TF provider has no DB resource, design §12.4);
  add `DATABASE_URL` to Terraform as the `${{Postgres.DATABASE_URL}}` reference
  variable and verify on first apply it is written verbatim (fallback: set that
  one var in the dashboard); guard the unmanaged Postgres service against a
  project-level `terraform destroy`. Operational — verified by deploy, not an
  automated test.
- [ ] T020 [artifacts: infrastructure] Push the OAuth client id/secret (Google +
  GitHub) and the session/cookie signing secret to Railway as **sealed**
  variables via `railway variables --set "…=$(op read op://sync-tab-scroll/…)"`
  (creds already in 1Password), never through tfstate (design §12.4). Verify
  prod sign-in works end-to-end at `sync-tab-scroll.up.railway.app` and that the
  anonymous path still serves if the DB reference fails to resolve. Operational —
  manual verification.
