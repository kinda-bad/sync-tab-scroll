# Design Proposal — User Accounts, Catalogue Ownership & In-App Authoring (REVIEWED)

_Status: reviewed/refined proposal (pre-ARDD-refine). 2026-07-12._
_Supersedes `design-user-accounts-2026-07-12.md` for refine purposes; the
original is kept for provenance._

## 1. Problem / motivation

Two concrete frictions on the now-public Railway deployment
(https://sync-tab-scroll.up.railway.app), not an abstract desire for "auth":

1. **Re-entering the setlist activation key every session.** The `kinda-bad`
   band pack is unlocked per-session via its key
   (`Session.unlockedCatalogueIds`, ephemeral — `server/src/session-store.ts`
   starts it empty on every `create()`). The host re-types it on every new
   session. The unlock should **persist to a person**.
2. **No in-app authoring.** Adding a song or creating a catalogue/setlist is
   an operator-only offline CLI flow today (`extract-lyrics`,
   `create-catalogue`, `record-consent` — pipeline.md). A UI for adding songs
   and building catalogues/setlists needs per-person identity.

Accounts are the **substrate** these two features need, not the goal.

## 2. Hard constraint — anonymous-first, strictly additive

**Everything that works logged-out today keeps working unchanged. Registration
only ADDS capability; nothing currently available is lost, and login is never
forced anywhere in the core loop.**

Concretely:
- Anonymous users still create/join sessions, play the public `default`
  catalogue, and unlock a private catalogue per-session by key exactly as
  today.
- Anonymous and logged-in participants coexist in the same session; no flow
  distinguishes them except the added capabilities below.
- The activation key is **not replaced** by membership — it coexists. A
  logged-in user who enters a valid key gets the same unlock **persisted**; an
  anonymous user's unlock stays per-session.
- **Operationally additive too (new, review-added):** the server must run
  fully — all current behavior — with **no database configured**. If
  `DATABASE_URL` is unset, auth routes are disabled and the app is exactly
  today's app. This keeps local dev, CI, the existing test suite, and the
  self-hosted/personal deployment mode (infrastructure.md Song Consent Gate's
  "local deployment" case) working with zero new moving parts. Postgres is a
  Railway-deployment concern, not a baseline requirement. Treat a hard
  DB-at-startup dependency as a defect against this section.

## 3. Decisions already made

- **Identity:** OAuth (Google/GitHub), Authorization Code flow, server-side.
  No passwords stored. **No account linking in v1**: a `User` is keyed by
  `(oauthProvider, oauthSubject)`; the same human signing in with Google and
  GitHub gets two independent accounts. Accepted — linking is a solved-later
  problem and nothing in Phases A–B makes it harder later.
- **Datastore:** Railway Postgres (managed add-on), provisioned via the
  existing `infra/` Terraform. Optional at runtime per §2.
- **OAuth tokens are not stored.** The provider access token is used once at
  callback time to fetch the profile, then discarded. No refresh tokens, no
  token table — the app never calls provider APIs on the user's behalf.

## 4. Documented decisions this reverses (and the amendment mechanics)

- `constitution.md` Scope ("no auth or rate limiting required… self-hosted/
  small-group") — the public Railway deployment already broke the premise;
  the constitution explicitly anticipated hardening. **Process note for
  `/ardd-refine`:** this is a constitution amendment with a Sync Impact
  Report and a version bump (MINOR at least — material expansion of scope;
  arguably MAJOR if the no-auth statement is read as load-bearing posture).
  Do not edit the scope statement silently.
- `infrastructure.md`: "Sessions are server-memory-only… No durable backing
  store" — **narrowed, not reversed**. Sessions stay ephemeral and
  memory-only; a durable user/identity/ownership layer is added *alongside*
  them. The refine should reword that section to scope the statement to
  session state specifically, so it stays true.
- `pipeline.md` (**Phase C only**): "operator-driven, offline… no upload
  mechanism or web form", and datamodel.md's resolved "CLI drop-in over a web
  upload form" decision for consent recording. Phase C reverses both. Phases
  A and B reverse **nothing** in pipeline.md — worth keeping explicit so the
  refine doesn't touch pipeline.md until Phase C is actually planned.

## 5. Proposed data model (additive)

Durable (Postgres):

- **`User`** — `id` (UUID), `oauthProvider` (`'google'|'github'`),
  `oauthSubject`, `displayName`, `email`, `createdAt`. Unique on
  `(oauthProvider, oauthSubject)`.
- **`CatalogueMembership`** — `userId` FK, `catalogueId` (string slug — see
  referential-integrity note below), `grantedVia` (`'owner'|'key'|'invite'`),
  `grantedAt`. Unique on `(userId, catalogueId)`. This is the durable form of
  "unlocked."
- **`CatalogueOwnership`** (Phase B) — `catalogueId` (slug), `ownerId` FK.
  Kept as its own row/table rather than a field on `Catalogue`, because
  `Catalogue` **is not a durable entity** — it's derived at startup from a
  filesystem scan (`catalog-loader.ts`). See bootstrap note in §7 Phase B.

**Referential integrity across two stores (review-added, load-bearing):**
`catalogueId` in Postgres is a **plain slug string, no FK, no enforcement**
against the filesystem-derived catalogue set. An operator deleting a
catalogue directory leaves dangling membership rows; they are **inert by
construction** — membership only ever *adds* ids to
`Session.unlockedCatalogueIds`, and `visibleCatalog()` already ignores
unlocked ids that match no loaded catalogue. No cleanup job, no
reconciliation. Getting this wrong (trying to enforce FK-like integrity
between Postgres and a directory scan) is the expensive trap this section
exists to name.

In-memory / wire model:

- **Connection identity, not participant identity, in Phase A.** The
  authenticated `userId` lives on the `ConnectionRegistry` entry (alongside
  `sessionCode`/`participantId`), read from the auth cookie at WS upgrade.
  That is all Phase A's features need (membership writes on key entry,
  membership reads on join). `Participant.userId` — a peer-visible wire
  field broadcast in every `session-state` — is **deferred to Phase B**,
  where invites/ownership first make peer-visible identity useful. This
  trims Phase A's shared-types and client-store surface to nearly nothing.
- **Unlock persistence rule (tightened):**
  - A logged-in **host** entering a valid key: existing per-session unlock
    happens exactly as today, *plus* a
    `CatalogueMembership(grantedVia:'key')` upsert for that user.
  - On `session-create` and `session-join`, **any authenticated
    participant's** memberships are unioned into
    `Session.unlockedCatalogueIds` (followed by the same
    `session-state` + `catalog` re-broadcast pair `catalogue-unlock`
    already uses when the set grows). Rationale: the band use case is "any
    band member joins and the setlist is just there," without requiring the
    host specifically to hold the membership. This is deliberately
    session-granular — the whole session, anonymous participants included,
    sees the unlocked songs, exactly as a key unlock behaves today. A
    member auto-unlocking is semantically the member handing the host the
    key, which they could always do. **Flagged as an owner decision** (§9
    Q1) because it widens who can cause an unlock from host-only to
    any-authenticated-joiner; the fallback position is host-memberships-only.
  - Anonymous key entry: unchanged, per-session only.
  - Unlock granularity stays **session-level**. There is no per-user catalog
    visibility in Phases A–B — `visibleCatalog(catalog, session)` keeps its
    signature, and the `catalog` message stays identical for every recipient
    in a session. Per-user visibility is a Phase C concern (owners seeing
    their own unpublished catalogues) and is one of the things that makes
    Phase C expensive (§8).

## 6. Auth mechanics

- New HTTP routes on the existing `http.Server` (`server/src/server.ts`
  already chains handlers: catalog → client-static → 404; auth mounts ahead
  of them): `/auth/<provider>/login`, `/auth/<provider>/callback`,
  `/auth/logout`, `/me`. All are no-ops/404 when no DB is configured (§2).
- **Session identity: signed HTTP-only cookie — decided, not "or bearer
  token."** Stateless: HMAC-signed `{userId, iat}` (or a JWT if a dependency
  is preferred; either way no server-side session table — logout clears the
  cookie). `HttpOnly; Secure; SameSite=Lax`, long expiry. Rationale for
  cookie over bearer: the browser attaches cookies to the WS upgrade request
  automatically, so WS identity needs **no protocol change** — no
  first-message auth handshake, no interaction with the reconnect/rejoin
  machinery in `ws-client.ts`. A bearer token would need both.
- **WS identity:** `wss.on('connection', (socket))` becomes
  `(socket, req)`; the cookie is verified from `req.headers.cookie` and the
  resulting `userId` (or null) is stamped on the connection's registry entry
  at attach time. Anonymous sockets carry null and behave exactly as today.
- **Dev-mode wrinkle (review-added):** in dev the page is served by Vite and
  the server runs on `VITE_BACKEND_PORT`. Same host + different port is
  same-site, so the `SameSite=Lax` cookie does flow to the WS handshake —
  but the OAuth redirect dance must land the browser back on the *Vite*
  origin. Simplest fix, matching the existing `/catalog` proxy: add
  `/auth/*` and `/me` to Vite's dev proxy so the whole flow is same-origin
  in dev too. Production is already same-origin (single Railway service).
- OAuth client secrets: 1Password → Terraform → Railway env vars, same
  pattern as `railway_prod`. **Note:** Terraform state is a local gitignored
  file (infrastructure.md); secrets passed as TF variables land in
  `terraform.tfstate` plaintext. Acceptable under the existing
  single-operator posture, but say so in the refine rather than discovering
  it later.
- **Login mid-session needs no new mechanism (review-added, resolves the
  original's open question 4):** OAuth is a full-page redirect, which
  reloads the app, which already re-joins via reconnect-by-identity
  (infrastructure.md Reconnect By Identity) — the reclaimed seat's
  connection now carries the cookie, and the join-time membership union
  (§5) fires. "Upgrade a live participant in place" is explicitly a
  non-mechanism; the page reload *is* the upgrade path.
- **Testing (constitution Principle VII):** Phase A's server work needs a
  test strategy for the DB layer before implementation — either a
  podman-run Postgres (user preference: podman over Docker) in
  vitest/CI, or an in-memory repository interface with the pg
  implementation integration-tested separately. Decide in the plan, not
  mid-task.

## 7. Phasing (front-loads the daily-friction fix)

- **Phase A — Accounts + persisted unlock.** OAuth routes + optional
  Postgres + `User` + connection-level `userId` + `CatalogueMembership`
  seeded by key entry + join-time membership union. Client: a login
  button/avatar chip and `/me` wiring — no lobby/playback flow changes.
  *Delivers: "log in once, never re-type the band key." Smallest valuable
  slice, and it touches a genuinely small surface: `server.ts` (upgrade +
  routes), `connections.ts`, `session-create`/`session-join`/
  `catalogue-unlock` handlers, one new auth module, one new db module.*
- **Phase B — Ownership & invites (kept deliberately thin; value is
  marginal over A).** With Phase A shipped, a band member's total lifetime
  cost without Phase B is *typing the key once ever*. Phase B's real
  additions are: `CatalogueOwnership`, invites (`grantedVia:'invite'`),
  `Participant.userId` on the wire for peer-visible identity, and —
  the piece the original under-specified — **ownership bootstrap**: nothing
  can set `ownerId` for the existing filesystem catalogues (`kinda-bad`)
  except a new operator CLI (`set-catalogue-owner <slug> <user-email>` or
  similar), since these catalogues predate accounts and have no in-app
  creation path until Phase C. Invite transport also needs deciding
  (§9 Q3): invite-by-link is recommended over invite-by-email (no email
  sending infrastructure exists or should exist for this). **Recommendation:
  ship A, then re-evaluate whether B is worth doing before C at all** — B
  mostly exists as scaffolding for C's "owner edits their catalogue"
  authorization, and could be folded into C.
- **Phase C — In-app authoring UI.** Upload a `.gp`, run the pipeline
  server-side (alphaTab already runs in Node — pipeline.md validated this;
  note the pipeline also does zip/XML reads and *network calls to
  lrclib.net*, which now happen at request time on the server), create/edit
  catalogues & setlists, in-app consent/ToS capture. *Its own subsystem;
  see §8. Not to be planned until A is live and B's fate is decided.*

## 8. Biggest architectural ripple — dynamic catalog (validated; it is the cost center, and slightly bigger than the original says)

The original's core claim is **correct** and verified against the code: the
catalog is built exactly once, at `createServer()` (`server.ts:20`,
`loadCatalog()` filesystem scan), held as an immutable server-global
(`HandlerContext.catalog`), filtered per-session by `visibleCatalog()`, with
assets served by `catalog-static.ts` straight off `CATALOG_ROOT`, and
pipeline.md declaring "the pipeline is the only writer of this structure —
the server only reads it." Every one of those assumptions breaks under
user-authored content. OAuth, by contrast, attaches at two seams
(HTTP routes, WS upgrade) that already exist.

Review additions to the ripple inventory — things the original's two bullet
questions don't cover but that are part of the same decision:

1. **Storage** (the original's question, still primary): Railway volume
   (server writes song directories, mutates/re-scans), object storage, or DB
   blobs. Note the Railway volume already exists and `catalog-static.ts`
   already serves it — "server writes the same directory layout the pipeline
   writes, then updates the in-memory catalog" is the path of least
   invention and keeps the pipeline's on-disk format as the single format.
   Leading candidate, not yet decided.
2. **Mutation model**: `HandlerContext.catalog` becomes mutable state with
   broadcast obligations (every session whose visible catalog changed needs
   the `catalog` re-send that `catalogue-unlock` already models). This is a
   Principle I question: the catalog becomes a store, not a snapshot.
3. **Per-user visibility** (from §5): an owner must see their own
   not-yet-published catalogue when *they* join — the first time the
   `catalog` message differs per recipient within one session. That is a
   bigger wire/model change than any Phase A/B item.
4. **Upload trust surface**: arbitrary-file upload + server-side parsing of
   attacker-supplied zip/XML (`.gp` is a zip; the pipeline reads
   `score.gpif` raw) + request-time lrclib.net calls — precisely the threat
   model datamodel.md's "CLI drop-in over a web upload form" resolution
   rejected. Reversing it means owning size limits, parse sandboxing/
   timeouts, and staging.
5. **Consent/legal**: in-app ToS capture with a real `tosVersion` (the
   placeholder problem datamodel.md's Production Annotations already names),
   plus a takedown story once strangers can publish commercial tabs to a
   public URL.

Phases A and B require **none** of this — they layer durable
users/memberships/ownership over the existing immutable filesystem catalog.
The refine should record §8 as a named open decision in infrastructure.md,
not attempt to resolve it.

## 9. Open questions (owner decisions needed before `/ardd-refine`)

1. **Membership auto-unlock scope** — any authenticated participant's
   memberships union into the session's unlocks at join (recommended;
   matches the band use case), or host's memberships only (strictest
   reading of today's host-only unlock)? §5 has the trade-off.
2. **Dynamic catalog storage** (§8.1) — volume-as-canonical-format vs
   object storage vs DB blobs. Highest-impact Phase C decision; can be
   deferred until Phase C planning, but must not be decided implicitly.
3. **Phase B fate** — ship as its own phase, or fold ownership/invites into
   Phase C once C is planned? (§7 recommends deciding after A ships.)
   If kept: invite-by-link vs invite-by-email.
4. **Consent/ToS for user uploads** (Phase C) — who asserts distribution
   consent for a user-uploaded commercial `.gp`, and what real ToS text
   replaces `dev-placeholder`? Legal/operator decision, blocks Phase C
   shipping, not Phase C design.
5. **DB test strategy** (§6) — podman Postgres in the test loop vs
   repository-interface seam. Small, but Principle VII makes it a
   plan-time requirement, not an implementation detail.

Resolved by this review (no longer open): cookie vs bearer (cookie, §6);
anonymous→logged-in mid-session (page-reload path, §6); catalogue id space
(single slug space, DB stores slugs with no cross-store FK, §5; Phase C's
asset serving folds into Q2).

## 10. Risks

- **Dynamic catalog (§8) is the real cost center** — confirmed against the
  code, and broader than storage alone (mutation model, per-user
  visibility, upload trust surface).
- **Copyright/consent exposure** — user uploads of commercial tabs to a
  public URL. Phase C must not ship without a consent/ToS gate and a real
  `tosVersion`.
- **Cross-store dangling references** — mitigated by design (§5's inert-
  dangling-rows rule); becomes a real bug only if someone later "fixes" it
  with enforcement.
- **Scope** — Phase C is a product in itself; A is the tractable,
  high-value near term, and B may not need to exist independently.
- **Provider drift** — the community Railway Terraform provider must be
  confirmed to provision a Postgres service + `DATABASE_URL` wiring; a
  30-minute spike before the Phase A plan, since the fallback (click-ops
  the DB, Terraform the env var) is acceptable but should be a recorded
  decision, not an accident.

## 11. Non-goals (for now)

- Keeping strangers out / locking the app (the public demo path stays).
- Rate limiting / abuse hardening (separate, still-open concern — but note
  OAuth callback + Postgres slightly raise the stakes of leaving the
  wrong-key path unlimited; still out of scope here).
- Email/password or magic-link identity (OAuth chosen).
- Account linking across providers (§3 — two accounts is accepted).
- Persisting *sessions* — session state stays memory-only; only identity,
  membership, and (later) ownership are durable.

## 12. Resolved owner decisions (2026-07-12)

All pre-`/ardd-refine` open questions are now settled. This section is the
authoritative decision record; the sections above stand except where narrowed
here.

1. **Membership auto-unlock scope — host-only.** On `session-create`/`join`, a
   logged-in **host's** persisted `CatalogueMembership`s auto-populate
   `Session.unlockedCatalogueIds`. Non-host authenticated participants' do not.
   This preserves today's host-only unlock authorization exactly; widening is a
   later, deliberate change.
2. **Phasing collapses to two — Phase B is deferred and folded into authoring.**
   - **Phase 1 — Accounts + persisted unlock:** OAuth + optional Postgres +
     `User` + `CatalogueMembership` (seeded by host key-entry) + a **minimal
     ownership-bootstrap CLI** so the owner's account can own the existing
     `kinda-bad` filesystem catalogue. Delivers the entire daily-friction fix.
   - **Phase 2 — In-app authoring UI:** carries real ownership/permissions
     (built where first needed) and the dynamic-catalog work (§8). Standalone
     "ownership & invites" is not its own milestone.
3. **DB test strategy — containerized real Postgres, podman preferred**
   (podman 5.8.3 and docker 20.10.21 both present locally). Plan-time decision
   per constitution Principle VII.
4. **Datastore + secrets architecture** (from spike
   `spike-datastore-secrets-2026-07-12.md`):
   - **Postgres is NOT Terraform-managed.** The community Railway TF provider
     (v0.6.2) has no database/plugin/template resource. Create the Postgres
     service **once by hand in the Railway dashboard**.
   - **`DATABASE_URL` reaches the app as a Railway reference variable**
     (`${{Postgres.DATABASE_URL}}`), resolved at deploy — only the non-secret
     reference string is ever in tfstate.
   - **Secrets never touch tfstate (no state encryption).** OAuth client
     secrets + the session-signing key live canonically in **1Password**,
     pushed to Railway as **sealed** variables via
     `railway variables --set "…=$(op read …)"`. Terraform manages topology +
     non-secret vars only. (TF `sensitive = true` does not keep values out of
     state — hence this out-of-band pattern.)
   - **No Supabase.** Its client-driven OAuth can't cleanly meet the
     HTTP-only-cookie-on-WS-upgrade requirement without a hand-rolled relay
     anyway; hand-rolled Google/GitHub OAuth on the existing shared
     `http.Server` + signed HTTP-only cookie is the simpler, safer fit, and
     self-disables when unconfigured (satisfies "runs with no DB").
   - **Server runs with no DB configured** (auth routes disabled when
     unconfigured) — the operational half of the additive constraint. A hard
     `DATABASE_URL`-at-boot dependency is a defect.
   - Known follow-ups to carry into the plan: verify on first real apply that
     the provider writes the `${{…}}` reference verbatim (fallback: set that one
     var in the dashboard); the unmanaged Postgres service is invisible to
     Terraform (guard against project-level destroy); sealed vars don't copy to
     duplicated environments.

**Process note for `/ardd-refine`:** reversing the constitution's
no-auth/no-datastore scope needs a **versioned amendment with a Sync Impact
Report**; `infrastructure.md`'s "no durable backing store" must be **narrowed to
session state** (still true), not deleted.

## 13. Adversarial-review resolutions (2026-07-12)

Red-team pass (`design-user-accounts-2026-07-12.adversarial.md`) verdict: **go
with fixes, no fundamental rework.** All findings resolved as follows; these
supersede any conflicting detail above and are binding on `/ardd-refine`.

- **S1 (showstopper) — OAuth CSRF.** The Authorization Code flow MUST use a
  `state` parameter (+ PKCE + nonce), validated on callback. Non-negotiable.
- **S2 (showstopper) — revocable sessions.** Replace the stateless long-expiry
  cookie (§6, §12.4) with a **server-side `sessions` table** (opaque session id
  in the HTTP-only cookie; server holds expiry + a revocation flag / version).
  Enables logout-everywhere and post-compromise kill. Adds one table to the
  schema.
- **S3 (showstopper) — WS-upgrade CSRF.** Add explicit **`Origin` allowlist
  validation** on the WebSocket upgrade (`server/src/server.ts` upgrade handler,
  currently none). `SameSite=Lax` must not be the only defense.
- **S4 (serious) — unlock semantics: RE-LOCK ON HOST CHANGE.** Membership-based
  unlocks follow the host: on host succession, **re-derive**
  `Session.unlockedCatalogueIds` from the *new* host's memberships rather than
  leaving the append-only set intact. A catalogue **unlocked via a key typed
  this session remains a session fact** (matches today's behavior); a catalogue
  unlocked *only* by the departed host's membership **re-locks** if the new host
  isn't a member. Closes the "private catalogue leaks to an all-anonymous
  session after the host departs" hole while keeping the convenience goal.
  (This means `unlockedCatalogueIds` is no longer purely append-only — the
  membership-derived portion is recomputed on host change.)
- **S5 (serious) — key rotation revocation.** `CatalogueMembership` carries a
  **key-epoch / version** referencing the activation-key generation it was
  granted under; rotating a leaked key bumps the epoch and invalidates old
  `grantedVia:'key'` grants. Without this a redeemed leaked key is permanent.
- **S7 (serious) — runtime DB failure contract.** §2's guarantee is boot-time
  only; specify **graceful degradation when the DB dies mid-run**: auth-dependent
  features fail soft (treat as logged-out / no persisted membership), the
  anonymous path and live session stay fully functional, no crash.
- **S8 (serious) — membership key namespacing.** Key `CatalogueMembership` on a
  **stable catalogue identifier** (owner-namespaced, or a durable catalogue
  UUID once catalogues are DB-backed) rather than a bare filesystem slug, to
  avoid a Phase 2 slug-collision privilege-escalation. Still no cross-store FK
  (dangling rows stay inert).

Net effect on the data model: add a `sessions` table (S2) and a key-epoch
column + stable-id membership key (S5, S8); make the membership-derived slice of
`Session.unlockedCatalogueIds` recomputed on host change (S4).
