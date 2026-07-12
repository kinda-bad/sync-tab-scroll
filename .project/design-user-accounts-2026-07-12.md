# Design Proposal — User Accounts, Catalogue Ownership & In-App Authoring

_Status: draft proposal (pre-ARDD-refine). 2026-07-12._

## 1. Problem / motivation

Two concrete frictions on the now-public Railway deployment
(https://sync-tab-scroll.up.railway.app), not an abstract desire for "auth":

1. **Re-entering the setlist activation key every session.** The `kinda-bad`
   band pack is unlocked per-session via its key
   (`Session.unlockedCatalogueIds`, ephemeral). The host re-types it on every
   new session. The user wants the unlock to **persist to them**.
2. **No in-app authoring.** Adding a song or creating a catalogue/setlist is
   an operator-only offline CLI flow today (`extract-lyrics`,
   `create-catalogue`, `record-consent`). The user wants a **UI** where people
   can add songs and build catalogues/setlists — which does not work without
   per-person identity.

Accounts are therefore the **substrate** these two features need, not the goal.

## 2. Hard constraint — anonymous-first, strictly additive

**Everything that works logged-out today keeps working unchanged. Registration
only ADDS capability; nothing currently available is lost, and login is never
forced anywhere in the core loop.** This is the primary guardrail and it
de-risks the whole change: the accounts layer is additive, not a migration or
a gate.

Concretely:
- Anonymous users still create/join sessions, play the public `default`
  catalogue, and **unlock a private catalogue per-session by key** exactly as
  today.
- `Participant` gains an **optional** `userId` (null = anonymous). Anonymous and
  logged-in participants coexist in the same session.
- The activation key is **not replaced** by membership — it coexists. A
  logged-in user who enters a valid key gets the same unlock **persisted**; an
  anonymous user's unlock stays per-session.

## 3. Decisions already made

- **Identity:** OAuth (Google/GitHub). No passwords stored.
- **Datastore:** introduce the project's first durable store — **Railway
  Postgres** (managed add-on, provisioned via the existing `infra/` Terraform).

## 4. Documented decisions this reverses

- `constitution.md`: **no-auth** and **no durable datastore** (the "self-hosted/
  small-group, not public/untrusted traffic" premise already broke when we
  deployed publicly; the constitution explicitly anticipated hardening as a
  future direction).
- `infrastructure.md`: **"Sessions are server-memory-only… No durable backing
  store."** Sessions stay ephemeral; a durable **user/identity/ownership** layer
  is added alongside them.
- `pipeline.md` (**Phase C only**): **"operator-driven, offline… no upload
  mechanism or web form."** In-app authoring directly contradicts this.

## 5. Proposed data model (additive)

- **`User`** — `id`, `oauthProvider` (`google|github`), `oauthSubject`,
  `displayName`, `email`, `createdAt`. Durable (Postgres).
- **`Participant.userId`** — optional FK to `User`; null = anonymous.
- **`Catalogue.ownerId`** — optional FK to `User`; null for the built-in
  filesystem catalogues (`default`, `kinda-bad`) that predate accounts.
- **`CatalogueMembership`** — `userId`, `catalogueId`, `grantedVia`
  (`owner | key | invite`), `grantedAt`. This is the durable form of "unlocked."
- **Unlock persistence rule:** entering a valid key **while logged in** creates
  a `CatalogueMembership(grantedVia:'key')`. On `session-create`/`session-join`,
  a logged-in user's memberships auto-populate `Session.unlockedCatalogueIds`.
  Anonymous key entry is unchanged (per-session only).

## 6. Auth mechanics

- OAuth **Authorization Code** flow, server-side. New HTTP routes on the
  existing `http.Server`: `/auth/<provider>/login`, `/auth/<provider>/callback`,
  `/auth/logout`, `/me`.
- Session identity via a signed **HTTP-only cookie** (or bearer token); the WS
  handshake reads it to associate the socket with a `User`.
- OAuth client secrets stored in 1Password (same pattern as `railway_prod`),
  injected as Railway env vars via Terraform.

## 7. Phasing (front-loads the daily-friction fix)

- **Phase A — Accounts + persisted unlock.** OAuth + Postgres + `User` +
  `Participant.userId` + `CatalogueMembership` seeded by key entry.
  *Delivers: "log in once, never re-type the band key." Smallest valuable slice.*
- **Phase B — Ownership & membership.** `Catalogue.ownerId`; owners invite
  members directly (`grantedVia:'invite'`); band members get access without ever
  touching a key.
- **Phase C — In-app authoring UI.** Upload a `.gp`, run the pipeline
  server-side (alphaTab already runs in Node), create/edit catalogues &
  setlists, in-app consent/ToS capture. *Its own subsystem.*

## 8. Biggest architectural ripple (not auth — dynamic catalog)

The catalog is currently **loaded once at server startup by scanning the
filesystem** (`catalog-loader.ts`, `infrastructure.md`). Phase C's user-created
content makes the catalog **dynamic at runtime**, which breaks the load-once
model far more deeply than auth does. This needs an explicit decision:
- Where does user-authored content live — the Railway **volume** (server writes
  files, re-scans), **object storage**, or **DB blobs**?
- Does `catalog-loader` gain a DB-backed source, or a runtime "add catalogue /
  add song" mutation + reload path?

Phase A and B do **not** require this (they only add durable users/memberships/
ownership over the existing filesystem catalog). It is a Phase C prerequisite.

## 9. Open questions

1. **Dynamic catalog storage** (§8) — the highest-impact Phase C decision.
2. **Consent/ToS for user uploads** — who asserts distribution consent for a
   user-uploaded commercial `.gp`? The existing consent system exists precisely
   for this; opening uploads to arbitrary users is a real legal surface.
3. **Session identity transport** — cookie vs bearer token for the WS handshake.
4. **Anonymous→logged-in mid-session** — upgrade a `Participant.userId` on login
   within an active session, or require login before join?
5. **Catalogue identity** — do DB-owned catalogues share the `id` slug space
   with filesystem catalogues, and how does `catalog-static.ts` serve their
   assets?

## 10. Risks

- **Dynamic catalog (§8) is the real cost center**, not OAuth. The "load once,
  filesystem-scanned, immutable" assumption is baked into the server.
- **Copyright/consent exposure** — user uploads of commercial tabs to a public
  URL. Phase C must not ship without a consent/ToS gate.
- **Scope** — Phase C is a product in itself; A and B are the tractable,
  high-value near term.

## 11. Non-goals (for now)

- Keeping strangers out / locking the app (the user is explicitly fine with the
  public demo path — see §2).
- Rate limiting / abuse hardening (separate, still-open concern).
- Email/password or magic-link identity (OAuth chosen).
