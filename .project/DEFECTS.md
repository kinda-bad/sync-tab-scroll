# Defects

_Last verified: 2026-07-12_

No defects found — artifacts match the codebase as of this run.

This pass focused on the freshly-merged **Accounts Phase 1** layer (~3,300 lines
across `server/src/accounts/`, `server/src/auth/`, `membership-unlock.ts`, the
account handlers, the client account UI, `packages/pipeline` epoch support, and
`infra/`), checked against every relevant artifact:

- **datamodel.md — Account Layer & Activation Key.** `User`,
  `CatalogueMembership`, `AuthSession` shared types
  (`packages/shared/src/index.ts`) and the Postgres schema
  (`server/src/accounts/migrations/0001_account_layer.sql`) match the documented
  fields, the `(oauthProvider, oauthSubject)` unique key, the `(userId,
  catalogueId)` uniqueness, the `userId`/`id` indexes, `keyEpoch`, and the
  no-cross-store-FK rule for `catalogueId` (S8). Activation-Key `epoch`
  (`catalog-loader.ts`, absent ⇒ 1) matches.
- **infrastructure.md — User Accounts / Activation Key Unlock / Host
  Succession / Deployment.** OAuth routes mount ahead of catalog/static/404 with
  `state`/PKCE/nonce validated on callback (S1); the HTTP-only cookie carries
  only the opaque `AuthSession.id` with revocation via `revokedAt` (S2); the WS
  upgrade validates `Origin` before reading the cookie (S3), then resolves the
  single cookie→session→`userId` seam; key-unlock persists a best-effort
  `CatalogueMembership` at the current epoch keyed on the stable id (S5/S8);
  membership auto-unlock is host-only and re-derives on both succession and
  explicit host-delegate (S4); the account layer self-disables with no
  `DATABASE_URL` and fails soft mid-run (S7). `infra/main.tf` matches the
  out-of-band-Postgres + `${{Postgres.DATABASE_URL}}` reference-var +
  `prevent_destroy` + sealed-secrets design (§12.4).
- **ui.md — Account & Sign-In.** The client renders the three documented states
  (unavailable ⇒ affordances absent, signed-out ⇒ Sign in, signed-in ⇒ name +
  Sign out); OAuth is a full-page redirect; sign-out revokes then reloads.
- **pipeline.md.** `create-catalogue` writes `epoch:1` and `rotate` bumps it
  (S5) — additive, reversing nothing in pipeline.md (design §4).
- **constitution.md.** Principle I (single account store client + single
  `AccountStore` facade server), II (`transferHost` shared, not duplicated), VI
  (named shared account types), VII (all 20 tasks test-first), VIII
  (`server/.env.example` in lockfile parity with `config.ts`) all upheld.

The pre-accounts codebase was verified clean in the 2026-07-10 pass and is
unchanged except for the additive account wiring above, so those findings stand.

Note (not a defect, no action): the session cookie sets `Secure` unconditionally
while the dev `PUBLIC_BASE_URL` default is `http://localhost:6000`. This works in
practice because browsers treat `http://localhost` as a secure context, so the
cookie persists in local dev. Flagged only for awareness.
