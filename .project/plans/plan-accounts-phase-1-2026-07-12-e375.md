---
status: approved
branch: accounts-phase-1
created: 2026-07-12
features: []
surfaced-defects: []
---

# Plan — Accounts Phase 1: OAuth Identity + Persisted Catalogue Unlock

## Goal

Ship the design-of-record's **Phase 1** (`.project/design-user-accounts-2026-07-12.reviewed.md`
§12.2): optional OAuth accounts backed by an optional Postgres store, so a
logged-in host who types a private catalogue's activation key once never
re-types it again — the entire daily-friction fix — with the anonymous path
completely unchanged.

## Scope

**In scope (Phase 1):**
- Hand-rolled Google + GitHub OAuth (Authorization-Code + `state` + PKCE +
  nonce, S1), server-side on the existing `http.Server`.
- Optional Postgres holding the three durable entities datamodel.md's Account
  Layer defines: `User`, `CatalogueMembership`, `AuthSession`.
- Revocable server-side sessions (S2): opaque `AuthSession.id` in an HTTP-only
  cookie; logout / revocation via `revokedAt`.
- WS-upgrade `Origin` allowlist (S3) + cookie → `AuthSession` → `userId` on the
  connection registry entry (connection-level identity only; no
  `Participant.userId` on the wire — that is Phase 2).
- Persisted unlock: a logged-in host's correct `catalogue-unlock` writes a
  best-effort `CatalogueMembership(grantedVia:'key', keyEpoch)`; key-epoch
  revocation (S5) via a new `epoch` field on `catalogue.json`; stable-id
  membership keying (S8).
- Host-only membership auto-unlock at `session-create`/`session-join`, and
  re-derive/re-lock of the membership-derived unlock slice on host change (S4).
- DB-optional boot + mid-run graceful degradation (S7): no `DATABASE_URL` ⇒
  whole account layer self-disables; a mid-run DB failure fails soft, never
  crashes.
- Client: a subordinate "Sign in with Google/GitHub" control on Landing, an
  account menu in the Lobby/Playback bar, `/me` wiring; sign-in affordances
  simply absent when accounts are unavailable.
- A minimal ownership-bootstrap CLI so the operator's account can be granted an
  owner-membership to the existing `kinda-bad` filesystem catalogue.
- Railway deployment: hand-created Postgres service, `DATABASE_URL` as a Railway
  reference variable, OAuth + session secrets pushed out-of-band as sealed
  Railway vars from 1Password.

**Explicitly out of scope (deferred to Phase 2 / authoring):**
- `CatalogueOwnership` as its own table, invites (`grantedVia:'invite'`),
  `Participant.userId` on the wire, per-user catalog visibility, in-app
  authoring/upload, dynamic mutable catalog, consent/ToS capture (design §8,
  §12.2 Phase 2).
- Account linking across providers (§3), rate limiting (still out of scope —
  infrastructure.md Production Posture; the constitution's Scope likewise does
  not require it), email/password identity.

## Technical Approach

Grounded entirely in decisions already written into the artifacts — this plan
references them rather than re-deciding:

- **Optional-by-construction, via a repository seam.** All durable access goes
  through a repository interface (`UserRepo`/`MembershipRepo`/`SessionRepo`, or
  one `AccountStore`). Two implementations: a Postgres-backed one and a
  **null/absent** one selected when `DATABASE_URL` is unset. The null impl is
  what makes "runs with no DB, auth self-disables" (infrastructure.md User
  Accounts) fall out of normal code paths instead of scattered `if (db)` guards,
  and it makes the anonymous path testable with zero new moving parts. Mid-run
  DB errors are caught at this seam and degrade soft (S7).
- **Two existing seams carry identity** (design §8, validated against code):
  HTTP routes mount ahead of catalog/static/404 on the shared
  `http.createServer` (`server/src/server.ts`); the WS upgrade
  (`wss.on('connection', (socket, req))`) reads the cookie after an `Origin`
  check. No WS protocol/first-message-auth change — the cookie rides the
  upgrade automatically (design §6).
- **Cookie carries only the opaque session id** (datamodel.md AuthSession;
  infrastructure.md). Revocation lives server-side (S2), which is the whole
  reason `AuthSession` is a table and not a stateless JWT.
- **No cross-store FK** (datamodel.md): `CatalogueMembership.catalogueId` is a
  plain stable-id string; a membership to an unloaded catalogue is inert, never
  an integrity error. Do not enforce referential integrity across Postgres and
  the filesystem catalog.
- **Config via `.env`** (constitution Principle VIII): `DATABASE_URL`, OAuth
  client id/secret per provider, session-signing/cookie config each land in
  `.env` with matching `.env.example` keys (secret placeholders, never real
  secrets) — lint-enforced.
- **DB test strategy — containerized real Postgres, podman preferred** (design
  §12.3; constitution Principle VII). The repository seam also lets pure-logic
  handlers be tested without a container; the pg implementation and the
  full-stack auth/unlock flows are integration-tested against a
  container-started Postgres.
- **Secrets/topology split** (design §12.4, spike-datastore-secrets): Postgres
  is created by hand in the Railway dashboard (community TF provider has no DB
  resource); Terraform manages only topology + the non-secret
  `${{Postgres.DATABASE_URL}}` reference var; OAuth/session secrets are pushed
  as sealed Railway vars via `railway variables --set "…=$(op read …)"`, never
  in tfstate.

## Phase Breakdown

Phases are ordered by dependency; each produces a demonstrable increment. Per
constitution Principle VII, code phases are test-first (failing test before
implementation); the deployment phase (P7) is operational and test-exempt.

### P1 — Durable store foundation (DB-optional) [prereq for P2–P5, P6-CLI]
- Repository interface for `User`, `CatalogueMembership`, `AuthSession` with a
  Postgres implementation and a null/absent implementation selected by presence
  of `DATABASE_URL`.
- Postgres schema + migrations matching datamodel.md exactly: `User` unique on
  `(oauthProvider, oauthSubject)`; `CatalogueMembership` keyed on stable id (S8)
  with `keyEpoch`, index on `userId`, unique `(userId, catalogueId)`;
  `AuthSession` lookup by `id`, index on `userId`.
- Containerized-Postgres test harness (podman preferred, docker fallback) wired
  into vitest/CI (design §12.3).
- `.env`/`.env.example` keys for `DATABASE_URL` (+ later OAuth/session keys) per
  Principle VIII.
- *Demonstrable:* server boots and passes existing suite with no DB (null repo);
  pg repo CRUD passes against the container.

### P2 — OAuth flow + revocable cookie sessions [depends on P1]
- `/auth/<provider>/login`, `/auth/<provider>/callback`, `/auth/logout`, `/me`
  routes mounted ahead of catalog/static/404 on the shared server.
- Google + GitHub Authorization-Code flow with `state` + PKCE + nonce validated
  on callback (S1). Provider access token used once to fetch profile, then
  discarded (design §3).
- `User` upsert by `(oauthProvider, oauthSubject)`; `AuthSession` create;
  HTTP-only `Secure` `SameSite` cookie carrying only `AuthSession.id` (S2);
  logout sets `revokedAt`.
- All routes return unavailable/404 when the null repo is active (no DB).
- Vite dev proxy extended to `/auth/*` and `/me` so the redirect dance is
  same-origin in dev (design §6 dev-mode wrinkle).
- *Demonstrable:* sign in with each provider, `/me` returns the user, logout
  clears/revokes; with no DB configured every route is inert.

### P3 — WS-upgrade hardening + connection identity [depends on P2]
- `Origin` allowlist validation on the WS upgrade (S3) before any cookie read.
- Resolve cookie → `AuthSession` (reject if expired/`revokedAt`) → stamp
  `userId` (or null) on the `ConnectionRegistry` entry at attach time.
- Reclaim stays keyed on `participantId` only — an auth cookie alone never
  reclaims a seat or host (infrastructure.md Reconnect By Identity interaction).
- Mid-run DB failure ⇒ treat connection as anonymous, no crash (S7).
- *Demonstrable:* an authenticated socket carries its `userId`; a
  disallowed-origin upgrade is rejected; anonymous sockets behave exactly as
  today.

### P4 — Activation-key epoch + persisted unlock [depends on P1, P3]
- Add `epoch` to `catalogue.json` (datamodel.md Activation Key), read by
  `catalog-loader.ts`; absent ⇒ treated as `1`. Extend the `create-catalogue`
  pipeline CLI to write/rotate `epoch`.
- On a correct logged-in-host `catalogue-unlock`, best-effort write
  `CatalogueMembership(grantedVia:'key', keyEpoch = catalogue's current epoch)`
  (S5), keyed on the catalogue's stable id (S8). Anonymous host unchanged
  (per-session only). DB unavailable ⇒ unlock still succeeds, membership write
  skipped (S7).
- *Demonstrable:* a signed-in host who unlocks by key gets a persisted
  membership row at the current epoch; anonymous unlock persists nothing.

### P5 — Host-only auto-unlock + re-lock on host change [depends on P3, P4]
- On `session-create`/`session-join`, union the **host's** valid memberships
  (epoch-current only, S5) into `Session.unlockedCatalogueIds`, followed by the
  existing `session-state` + `catalog` re-broadcast pair `catalogue-unlock`
  already uses. Non-host authenticated participants do **not** unlock (design
  §12.1 host-only).
- On host change (succession + explicit transfer), **re-derive** the
  membership-derived slice from the *new* host's memberships; key-typed-this-
  session unlocks stay (session facts) (S4). With no DB, this recomputation is a
  no-op.
- *Demonstrable:* a signed-in host with a prior membership joins and the private
  catalogue is unlocked with no key prompt; on host succession to a non-member,
  the membership-only catalogue re-locks while a key-typed one stays.

### P6 — Client sign-in UI + ownership-bootstrap CLI [depends on P2 for UI; P1/P4 for CLI]
- Landing: subordinate "Sign in with Google/GitHub" control; Lobby/Playback bar
  account menu (display name + Sign out, or a compact "Sign in" link); `/me`
  wiring; on OAuth return the existing refresh-rejoin path handles it (ui.md
  Account & Sign-In). *Accounts-unavailable ⇒ affordances absent, not disabled.*
- Member private catalogues render pre-unlocked in the Lobby picker for the
  signed-in host (ui.md).
- Minimal ownership-bootstrap CLI (e.g. `set-catalogue-owner <catalogue-stable-id>
  <user-email|provider:subject>`) that grants the operator's account a
  `CatalogueMembership(grantedVia:'owner')` for the existing `kinda-bad`
  catalogue (design §12.2) — no separate `CatalogueOwnership` table in Phase 1
  (that is Phase 2; see Open Questions Q1).
- *Demonstrable:* signed-in menu shows the user; the CLI grants an owner
  membership so that account auto-unlocks `kinda-bad` with no key at all.

### P7 — Railway deployment (operational, test-exempt) [depends on P1–P6]
- Create the Postgres service by hand in the Railway dashboard (design §12.4).
- Terraform: add `DATABASE_URL` as the `${{Postgres.DATABASE_URL}}` reference
  var; verify on first apply it's written verbatim (fallback: set that one var
  in the dashboard). Guard the unmanaged Postgres service against a project-level
  destroy.
- Push OAuth client id/secret + session/cookie secret as sealed Railway vars via
  `railway variables --set "…=$(op read op://sync-tab-scroll/…)"` (OAuth creds
  already in 1Password per project memory).
- *Demonstrable:* prod sign-in works end-to-end at
  `sync-tab-scroll.up.railway.app`; the deployed app still serves the anonymous
  path if the DB reference fails to resolve.

## Open Questions

1. **Ownership-bootstrap CLI representation.** Design §12.2 folds a "minimal
   ownership-bootstrap CLI" into Phase 1 (so the CLI itself is decided-in, not
   optional), but the durable Account Layer defines no `CatalogueOwnership`
   table until Phase 2, and datamodel.md labels `grantedVia:'owner'` as
   "Phase 2 / authoring." This plan represents Phase-1 ownership as a
   `CatalogueMembership(grantedVia:'owner')` row — sufficient for the only
   Phase-1 use (the operator auto-unlocking `kinda-bad` without a key) and
   avoiding a premature table. Confirm this minimal form is intended rather than
   pulling `CatalogueOwnership` forward. *(This is the one genuine open item;
   the CLI's inclusion is not in question.)*
2. **Repository granularity.** One `AccountStore` facade vs. three focused repos
   (`UserRepo`/`MembershipRepo`/`SessionRepo`). Naming/shape decision for the
   seam — resolve at P1 implementation, no artifact impact.

### Confirmed (not open — noted so implementation doesn't re-decide)
- **Cookie `SameSite=Lax`** — decided in design §6 (works with the top-level
  OAuth redirect and the same-origin WS upgrade; `Strict` would break the
  post-redirect return). datamodel/infrastructure say only "`SameSite`"; the
  value is `Lax`.
- **Ownership-bootstrap CLI is in Phase 1** — design §12.2, not deferrable.
