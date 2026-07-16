---
status: approved
branch: phase-2-in-app-authoring
created: 2026-07-14
features: [phase-2-in-app-authoring]
surfaced-defects: []
---

# Plan — Phase 2: In-App Authoring UI

## Goal

Let a signed-in catalogue owner create/edit catalogues and add songs from
the web UI, replacing the operator-only CLI as the *only* path (the CLI
stays as an additional, still-valid entry point) — the design-of-record's
Phase 2 (`design-user-accounts-2026-07-12.reviewed.md` §7/§8/§9/§12),
scoped and narrowed by owner decisions on 2026-07-14
(`research-phase-2-in-app-authoring-scoping-2026-07-14-6879.md`).

## Scope

**In scope:**
- `CatalogueOwnership` (durable Postgres row) + a minimal
  `set-catalogue-owner` CLI so the operator's account can be granted
  ownership of the existing `kinda-bad` filesystem catalogue.
- Dynamic catalog: `HandlerContext.catalog` becomes mutable at runtime;
  an authoring write triggers a re-scan and re-broadcasts `catalog` to
  every affected session.
- Per-user catalog visibility: `visibleCatalog()` gains a third parameter
  so an owner sees their own unpublished catalogue on join, before anyone
  unlocks it by key.
- Upload trust surface: request body size limit, pipeline parse timeout,
  staging (a rejected/malformed upload never reaches the live catalog or
  triggers a broadcast) — required before any upload route accepts
  traffic, public deployment or not.
- Server-side pipeline execution inside an HTTP request handler, subject
  to the above limits (the pipeline itself already runs in Node — no new
  library dependency).
- Storage: Railway volume, same on-disk format the pipeline already
  writes (owner decision — not object storage/DB blobs).
- In-app authoring UI: "My catalogues" (account-menu entry, owner-only),
  create catalogue, add song (file + consent form, real progress states),
  co-owners list + invite-by-link.
- `Participant.userId` becomes a wire field (broadcast in `session-state`)
  — needed for the co-owner/invite UI to show peer identity.
- In-app Consent Record capture, writing the same shape the CLI's
  `record-consent` writes — gated on a runtime flag for the public
  deployment (owner decision: build the mechanism now, gate only the
  public deployment's live acceptance, not the build, behind real ToS
  text later).

**Explicitly out of scope:**
- Replacing or deprecating the CLI (`create-catalogue`, pipeline
  extraction, `record-consent`) — it remains the only path for a fresh/
  self-hosted deployment with no account layer configured.
- Real ToS/consent legal text — a legal/operator decision that blocks the
  public deployment's upload route from being *enabled*, not this plan's
  build (constitution v1.6.0, infrastructure.md's Consent gating note).
- Account linking across providers, rate limiting (both still out of
  scope per the constitution's standing posture).
- Catalogue deletion/archival, song editing after upload (revisit only if
  requested — not implied by "create/add").

## Technical Approach

Grounded entirely in the artifact changes already applied this session
(constitution v1.6.0 amendment; datamodel.md's `CatalogueOwnership` +
mutable-catalog + `Participant.userId`-on-wire notes; infrastructure.md's
new "In-App Authoring" section covering mutation model, per-user
visibility, upload trust surface, and consent gating; pipeline.md's
additive-entry-point note; ui.md's new "In-App Authoring" section). This
plan's job is turning those into code, not re-deciding anything they
already settled.

**Sequencing rationale:** ownership (Phase 1 below) must exist before
anything can be authorized; the dynamic-catalog mechanism (Phase 2) must
exist before there's anywhere for an upload to land; the upload/pipeline
path (Phase 3) is the highest-risk piece (parsing untrusted input) and
should be hardened before any UI can reach it; the UI (Phase 4) is then a
comparatively mechanical consumer of already-working server capability;
consent gating (Phase 5) and ownership/invites (Phase 6) are each
self-contained additions that don't block or get blocked by anything
else, so they're ordered last but could run in either order or in
parallel with a second contributor.

## Phase Breakdown

### Phase 1: Ownership data model + bootstrap
- T001 [artifacts: datamodel] `CatalogueOwnership` table migration
  (Postgres, same migration mechanism Accounts Phase 1 used —
  `server/src/accounts/migrations/`): `id`, `catalogueId`, `ownerId` FK to
  `User`, `createdAt`. Index on `ownerId` (datamodel.md's Indexes note).
  Test-first per constitution Principle VII, matching this repo's existing
  DB-layer test strategy (containerized Postgres, podman preferred —
  design doc §12.3).
- T002 [artifacts: datamodel] `set-catalogue-owner <slug> <user-email>`
  operator CLI, writing a `CatalogueOwnership` row (and the matching
  `CatalogueMembership(grantedVia:'owner')`, so an owner is never locked
  out of their own catalogue's content — datamodel.md). Depends on T001.
- T003 [artifacts: infrastructure] A `HandlerContext`-level lookup —
  "does this `userId` own this `catalogueId`" — backing both the
  authorization check for authoring actions (Phase 4) and the per-user
  visibility check (Phase 2). Depends on T001.

### Phase 2: Dynamic catalog + per-user visibility
- T004 [artifacts: infrastructure] Make `HandlerContext.catalog` mutable:
  extract the re-scan call (`loadCatalog()`) into a function callable
  post-startup, not just at `createServer()`. No behavior change yet —
  this task only makes the re-scan re-invokable.
- T005 [artifacts: infrastructure] On a successful authoring write
  (Phase 3 will call this), re-scan and re-broadcast `catalog` to every
  session whose visible set changed — reuse the exact broadcast shape
  `catalogue-unlock` already uses when a session's unlocked set grows.
  Depends on T004.
- T006 [artifacts: infrastructure, datamodel] `visibleCatalog(catalog,
  session, userId?)` gains the third parameter: a catalogue is also
  visible if `userId` owns it (T003's lookup), in addition to the
  existing `unlockedCatalogueIds` check. Update every call site
  (`session-create`, `session-join`, and wherever else `visibleCatalog`
  is currently invoked) to pass the joining participant's `userId`.
  Test-first: an owner joining a fresh session sees their own
  not-yet-unlocked-by-anyone catalogue in the delivered `catalog`
  message. Depends on T003.
- T007 [artifacts: datamodel] `Participant.userId` becomes a broadcast
  wire field in `session-state` (currently connection-registry-only per
  Phase 1). Update the shared `Participant` type and the `session-state`
  message builder. Test-first: a `session-state` broadcast includes a
  logged-in participant's `userId`; an anonymous participant's is `null`.

### Phase 3: Upload trust surface + server-side pipeline
- T008 [artifacts: infrastructure] New authenticated HTTP route (e.g.
  `POST /catalogues/:slug/songs`), gated on T003's ownership check —
  reject with 403 for a non-owner. No file handling yet, just the route +
  auth gate, test-first.
- T009 [artifacts: infrastructure] Request body size limit + upload
  staging: the incoming `.gp` file is written to a temp location, never
  the live catalog directory directly, until validated. Test-first:
  an oversized upload is rejected before being fully buffered/written
  anywhere. Depends on T008.
- T010 [artifacts: infrastructure] Server-side pipeline execution against
  the staged file, with an enforced parse timeout (the pipeline's
  extraction stage must not hang the request indefinitely) — reusing the
  existing extraction pipeline code (pipeline.md), not a second
  implementation. On success, move the validated output from staging into
  the live catalog directory (Railway volume, same on-disk format the CLI
  writes) and call T005's re-scan-and-broadcast. On failure (parse error,
  timeout, malformed zip/XML), the staged file is discarded and nothing
  reaches the live catalog. Test-first: a malformed `.gp` file is
  rejected without corrupting or partially writing into the live catalog
  directory. Depends on T009.

### Phase 4: In-app authoring UI
- T011 [artifacts: ui] "My catalogues" entry in `AccountMenu` (Landing and
  Bar), visible only when `/me` (or an equivalent endpoint) reports the
  signed-in user owns at least one catalogue — absent otherwise, same
  pattern as every other capability-gated affordance in this app. Opens a
  new standalone modal (not a tab inside `SettingsModal`/song-part modal).
  Test-first CT spec mirroring `AccountMenu.ct.spec.ts`'s conventions.
- T012 [artifacts: ui] Catalogue list + "Create catalogue" form (name,
  public/private, key when private) inside the new modal, calling a new
  `POST /catalogues` route (mirrors the CLI's `create-catalogue`
  arguments — server-side implementation reuses the same directory/
  `catalogue.json` writing logic the CLI's script already has, factored
  into a shared function rather than duplicated). Depends on T001-T003.
- T013 [artifacts: ui] "Add song" form (file picker + consent fields:
  submitter identifier, ToS acceptance) posting to T008-T010's route,
  with real progress states (uploading → pipeline running → done/error)
  and inline (not toast) error display on failure — per ui.md's stated
  rationale for this being a form-level error, not a toast. Test-first CT
  spec covering all four states. Depends on T008-T010, T012.

### Phase 5: Consent gating
- T014 [artifacts: infrastructure, datamodel] Runtime consent-gating env
  var (mirroring `REQUIRE_SONG_CONSENT`'s existing pattern) — when set on
  the public deployment with no real ToS text configured, the upload
  route (T008) returns unavailable and the "Add song" UI action (T013)
  renders absent, not disabled. Test-first: the route and the UI both
  respect the flag.
- T015 [artifacts: datamodel] The consent fields captured in T013 write a
  Consent Record using the exact shape the CLI's `record-consent` already
  writes (datamodel.md) — one format, verified by a shared write function
  both paths call, not two independent implementations. Depends on T013.

### Phase 6: Ownership/invites
- T016 [artifacts: datamodel] Invite-by-link generation: an owner-only
  action producing a signed, single-use (or time-limited — decide at
  implementation time, not a design commitment here) link token. Depends
  on T001.
- T017 [artifacts: datamodel] Redeeming an invite link while signed in
  grants `CatalogueMembership(grantedVia:'invite')` **and**
  `CatalogueOwnership` in one action (ui.md — no separate "accept" step).
  Test-first. Depends on T016.
- T018 [artifacts: ui] "Co-owners" section per catalogue in the authoring
  modal: current owners list + "Generate invite link" control (owner-only).
  Test-first CT spec. Depends on T007 (peer-visible `userId` for
  displaying co-owner identity), T016, T017.

## Open Questions

- **Invite link expiry/single-use semantics** (T016) — explicitly left as
  an implementation-time decision, not a design commitment, since neither
  choice affects any other part of this plan.
- **Incremental vs. full catalog re-scan on an authoring write** (T004) —
  a full re-scan (simplest, matches today's startup behavior) is the
  default assumption; only worth revisiting if re-scan cost becomes
  measurably significant at real catalog sizes, which there's no evidence
  of yet.
