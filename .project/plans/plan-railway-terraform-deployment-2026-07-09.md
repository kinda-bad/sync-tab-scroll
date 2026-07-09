---
status: approved
branch: railway-terraform-deployment
created: 2026-07-09
features: [railway-terraform-deployment]
surfaced-defects: []
---

# Railway + Terraform Deployment

## Goal

Give the system a real, repeatable public deployment target on Railway,
provisioned as Terraform code rather than dashboard click-ops.

## Scope

**In scope**: a same-origin production mode for the client's WebSocket
connection; the server serving the built client SPA as a static fallback
alongside its existing `/catalog` route; a `Dockerfile` building the
whole workspace; Terraform config (`infra/`) provisioning a Railway
project, service, volume (for catalog content), and environment
variables; documentation for an operator to run `terraform apply`
themselves.

**Explicitly out of scope**: actually running `terraform apply` against
a real Railway account. That provisions real, billable cloud resources
under the user's own Railway credentials — a consequential, hard-to-fully-
reverse action this plan's implementation should never run
non-interactively. Implementation tasks produce and validate
(`terraform plan`) the Terraform config; applying it is a manual step the
operator runs themselves, documented but not executed here. Also out of
scope: custom domain (`[OPEN: custom domain]`, `infrastructure.md`),
populating the catalog volume with real content (operator's job,
unchanged from the existing local-deployment model), and multi-operator/
remote Terraform state (local state file is the resolved design,
`infrastructure.md`).

## Technical Approach

See `infrastructure.md`'s new **Deployment (Railway + Terraform)**
section for the full design and rationale. Summary: one Railway service
runs one Node process (the existing server), which now also serves the
built client SPA as a static fallback route — the same pattern already
used for `/catalog` (`server/src/catalog-static.ts`), extended rather
than a new mechanism (constitution Principle V). The client's WS
connection (`client/src/ws-client.ts`) gains a same-origin branch for
when `VITE_BACKEND_PORT` is unset at build time, replacing today's
dev-only hardcoded-port assumption. `CATALOG_ROOT` and
`REQUIRE_SONG_CONSENT` are already env-driven (`server/src/config.ts`) —
Terraform sets them as Railway service env vars; no server code change
needed for either. Railway's `$PORT` is already what `server/src/config.ts`
reads by default.

## Phase Breakdown

### Phase 1 — Same-origin WS client (no dependencies)

1. `[artifacts: infrastructure]` Test: add a test for
   `client/src/ws-client.ts`'s URL-building logic covering the new
   same-origin branch (when `VITE_BACKEND_PORT` is unset, build
   `wss://<host>` under `https:` and `ws://<host>` under `http:`, no
   explicit port) alongside the existing explicit-port branch. Follow
   the constitution's declared testing paradigm.
2. `[artifacts: infrastructure]` Implement the same-origin branch in
   `connect()`, per `infrastructure.md`'s Deployment section. Verify dev
   (`VITE_BACKEND_PORT=6080`) and e2e (`VITE_BACKEND_PORT=6081`) are
   unaffected — same explicit-port branch as today.

Demonstrable: the existing client vitest suite plus the new test pass;
`pnpm --filter client dev` still connects correctly against the local
server.

### Phase 2 — Server serves the client build (depends on Phase 1 only
loosely; can proceed in parallel)

3. `[artifacts: infrastructure]` Test: add a server test for a new
   client-static request handler (mirrors `catalog-static.test.ts`'s
   shape) — serves files under a configured client-dist root, 404s
   outside it (traversal safety, matching `catalog-static.ts`'s existing
   guard), falls through (not handled) for `/catalog/...` and WS-upgrade
   paths so those keep working unchanged.
4. `[artifacts: infrastructure]` Implement the handler
   (`server/src/client-static.ts`, following `catalog-static.ts`'s exact
   pattern) and wire it into `server/src/server.ts`'s request handling
   as the final fallback (catalog handler first, then client-static,
   then 404) — no change to the WS upgrade path.
5. `[parallel]` Verify manually: `pnpm --filter client build && pnpm
   --filter server build`, then run the server pointed at the client's
   `dist/` and confirm the built SPA loads and functions (create/join a
   session) served entirely from the server's own port, no separate
   client dev server involved.

Demonstrable: a single `node server/dist/index.js` process serves both
the app and the catalog on one port, end to end.

### Phase 3 — Dockerfile (depends on Phases 1-2)

6. Write a top-level `Dockerfile`: multi-stage build (pnpm install,
   `pnpm build` for the whole workspace), final stage runs
   `node server/dist/index.js` with `client/dist` and `packages/shared`'s
   build output available to it. No test — this is a build/ops artifact,
   verified by running it (next task), not unit-tested (constitution
   Principle VII's documentation/build-artifact carve-out doesn't
   strictly apply, but there's no meaningful unit test for a Dockerfile
   itself; verification is the build-and-run step below).
7. Verify: `docker build` succeeds locally and the resulting container,
   run with `PORT`/`CATALOG_ROOT` env vars and a bind-mounted local
   `catalog/` directory, serves the app correctly — the same manual
   check as Phase 2's task 5, now through the actual container image
   that will run on Railway.

Demonstrable: `docker run` the built image and use the app in a browser
against it.

### Phase 4 — Terraform config (depends on Phase 3; the Dockerfile must
exist and build correctly first)

8. Write `infra/` Terraform config: Railway provider block (pinned to
   `terraform-community-providers/railway`), a Railway project resource,
   a service resource built from the repo's `Dockerfile`, a volume
   resource mounted at the service's `CATALOG_ROOT` path, and service
   environment variables (`CATALOG_ROOT` pointed at the volume mount,
   `REQUIRE_SONG_CONSENT=true`, `HOST_REASSIGN_GRACE_MS` left at its
   documented default unless the operator overrides it). Local state
   (`infra/terraform.tfstate`), gitignored.
9. Add `infra/terraform.tfstate` (and `infra/.terraform/`) to
   `.gitignore`, matching the existing `.env`/`catalog/` gitignore
   entries' local-artifact reasoning.
10. Verify: `terraform validate` and `terraform plan` (read-only — no
    `apply`) succeed against the written config, confirming it's
    syntactically and structurally correct without provisioning
    anything. `[defect: none]` — this task is intentionally the
    boundary: `terraform apply` itself is not a task in this plan (see
    Scope).

Demonstrable: `terraform plan` output showing exactly the resources
described above, reviewed by the operator before they ever run `apply`
themselves.

### Phase 5 — Documentation (depends on Phase 4)

11. `README.md`: add a "Deploying to Railway" section pointing at
    `infra/`, explaining the one-time manual steps an operator runs
    themselves (Railway account/API token, `terraform init`, review
    `terraform plan`, then `terraform apply` — explicitly called out as
    the operator's own deliberate action, not something this repo's
    tooling runs for them) and how to populate the catalog volume
    post-provision (matches `pipeline.md`'s existing operator-driven
    model).
12. `infra/README.md` (or a comment block in the Terraform files): document
    the provider choice caveat (community-maintained, not official) and
    the local-state tradeoff, referencing `infrastructure.md`'s Deployment
    section rather than duplicating the reasoning.

Demonstrable: a fresh reader of `README.md` can follow the steps to
provision (or at least fully understand, without running `apply`
themselves) a Railway deployment.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Third-party, community-maintained Terraform provider (no official Railway provider exists) | Accepted, documented risk (`infrastructure.md`) — the alternative (dashboard click-ops) is exactly what this feature exists to avoid; revisit if an official provider ships |
| Local (not remote) Terraform state | Matches this project's existing single-operator/self-hosted posture (no auth, no rate limiting, fixed-interval reconnect); a remote backend would add real operational surface (a Terraform Cloud account, state locking, credentials) with no current multi-operator need to justify it |
| Single Railway service serving both static SPA and WS/API, rather than Railway-idiomatic separate static hosting | Avoids client/server needing each other's URLs at build time — a worse problem than the minor idiom deviation, at this app's scale |

## Open Questions

- `[OPEN: custom domain]` (carried from `infrastructure.md`) — deferred,
  not resolved by this plan.
- Exact Railway service sizing/plan tier is an operator decision at
  `terraform apply` time, not a design question this plan resolves.

## Production Annotation Summary

- The community Terraform provider dependency (Phase 4, task 8) —
  annotate at the point of the `provider` block in `infra/`.
- `terraform apply` as a deliberate, manual, non-automated operator step
  (Scope, above) — annotate in `README.md`'s Deploying to Railway
  section and in `infra/README.md`.
