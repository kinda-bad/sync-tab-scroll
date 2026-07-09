---
plan: plan-railway-terraform-deployment-2026-07-09.md
generated: 2026-07-09
status: ready
---

# Tasks

## Phase 1: Same-origin WS client

- [ ] T001 [artifacts: infrastructure] [parallel] Write a failing test
      (constitution Principle VII: test-first) for
      `client/src/ws-client.ts`'s WS URL-building logic. Add cases
      covering the new same-origin production branch: when
      `import.meta.env.VITE_BACKEND_PORT` is unset, the client should
      build `wss://<location.host>` when `location.protocol === 'https:'`
      and `ws://<location.host>` when `http:` — no explicit port. Keep
      the existing explicit-port case (`VITE_BACKEND_PORT` set → connect
      to `ws://${location.hostname}:${backendPort}`) covered too, so the
      test proves both branches. Confirm the new case fails before
      implementing.
- [ ] T002 [artifacts: infrastructure] Implement the same-origin branch
      in `client/src/ws-client.ts`'s `connect()`: when
      `import.meta.env.VITE_BACKEND_PORT` is unset, build the WS URL from
      `location.protocol`/`location.host` with no explicit port instead
      of falling back to port `'6080'`. Keep the existing explicit-port
      branch unchanged for when `VITE_BACKEND_PORT` is set. Make T001's
      test pass. Manually verify `pnpm --filter client dev` still
      connects correctly against the local server (dev sets
      `VITE_BACKEND_PORT=6080` in `client/.env`, so this exercises the
      unchanged explicit-port branch, not the new one) — confirms no
      regression to the existing dev flow. Run the full client vitest
      suite to confirm no other regressions.

## Phase 2: Server serves the client build

- [ ] T003 [artifacts: infrastructure] [parallel] Write a failing test
      (constitution Principle VII) for a new server request handler,
      mirroring `server/src/catalog-static.test.ts`'s shape and
      `server/src/catalog-static.ts`'s traversal-safety pattern: given a
      configured client-dist root directory, the handler serves files
      under it, 404s for paths that resolve outside that root, and
      returns `false` (falls through, unhandled) for any `/catalog/...`
      path so the existing catalog handler keeps owning those. Confirm
      it fails before implementing (the handler doesn't exist yet).
- [ ] T004 [artifacts: infrastructure] Implement
      `server/src/client-static.ts`, following
      `server/src/catalog-static.ts`'s exact pattern (same
      `createXRequestHandler(root)` shape, same traversal guard, same
      `boolean` handled/not-handled return). Wire it into
      `server/src/server.ts`'s `http.createServer` request handler as
      the fallback after the existing catalog handler (catalog handler
      first, then client-static, then 404) — do not touch the WS
      upgrade path. Make T003's test pass; run the full server vitest
      suite to confirm no regressions.
- [ ] T005 [parallel] Verify manually: run `pnpm --filter client build`
      then `pnpm --filter server build`, then start the built server
      (`node server/dist/index.js`) pointed at the client's `dist/` via
      whatever config `client-static.ts` reads, and confirm the built
      SPA loads in a browser and a full create-session/select-song
      flow works — served entirely from the server's one port, with no
      separate client dev server running. This is the phase's
      demonstrable increment; note any issues found rather than silently
      working around them.

## Phase 3: Dockerfile

- [ ] T006 [artifacts: infrastructure] Write a top-level `Dockerfile`:
      multi-stage build — an install/build stage that runs `pnpm install`
      and `pnpm build` for the whole workspace (`client`, `server`,
      `packages/shared`), and a final runtime stage that runs `node
      server/dist/index.js` with `client/dist` and
      `packages/shared`'s build output copied in alongside it. No test
      task for this one — it's a build/ops artifact verified by actually
      building and running it (T007), not unit-testable.
- [ ] T007 Verify: `docker build -t sync-tab-scroll .` succeeds locally.
      Run the resulting image with `PORT`, `CATALOG_ROOT` env vars set
      and a local `catalog/` directory bind-mounted at `CATALOG_ROOT`;
      confirm the app serves and functions correctly through the
      container, the same manual check as T005 but now through the real
      container image that will run on Railway. Note any issues found
      rather than silently working around them.

## Phase 4: Terraform config

- [ ] T008 [artifacts: infrastructure] Write `infra/` Terraform config:
      a provider block pinned to
      `terraform-community-providers/railway` (infrastructure.md's
      Deployment section — flagged as a community-maintained, non-
      official dependency, not a silent assumption), a Railway project
      resource, a service resource built from the repo's `Dockerfile`
      (T006), a volume resource mounted at the path the service's
      `CATALOG_ROOT` env var points to, and service environment
      variables: `CATALOG_ROOT` pointed at the volume mount,
      `REQUIRE_SONG_CONSENT=true` (deployed default, distinct from
      `server/.env.example`'s local `false` default — infrastructure.md's
      Config split note), and `HOST_REASSIGN_GRACE_MS` left at its
      documented default unless the operator wants to override it via a
      Terraform variable. State stays local (`infra/terraform.tfstate`)
      — no remote backend configured.
- [ ] T009 [parallel] Add `infra/terraform.tfstate`, `infra/*.tfstate.*`,
      and `infra/.terraform/` to the root `.gitignore`, alongside the
      existing `.env`/`catalog/` entries (same local-artifact-not-for-
      the-repo reasoning already documented there).
- [ ] T010 Verify: run `terraform validate` against `infra/`'s config —
      must succeed. Run `terraform plan` (read-only; never `terraform
      apply` — that provisions real, billable Railway resources under
      the operator's own account and is explicitly out of scope for this
      plan, see the plan's Scope section) and confirm its output shows
      exactly the resources described in T008: one project, one service,
      one volume, the documented env vars. This requires a Railway API
      token to be set locally for the `plan` step to actually reach
      Railway's API — if no token is available in this environment,
      note that explicitly rather than skipping the task silently, and
      fall back to confirming `terraform validate` alone plus a manual
      read-through of the generated plan structure against T008's
      description.

## Phase 5: Documentation

- [ ] T011 [parallel] Add a "Deploying to Railway" section to
      `README.md`, pointing at `infra/` and walking through the manual
      steps an operator runs themselves: obtain a Railway account/API
      token, `terraform init`, review `terraform plan`'s output, then
      `terraform apply` — explicitly stated as the operator's own
      deliberate action, never something this repo's tooling or CI runs
      for them. Include how to populate the catalog volume after
      provisioning (matches `pipeline.md`'s existing operator-driven
      model — no new upload mechanism).
- [ ] T012 [parallel] Add `infra/README.md` documenting: the Terraform
      provider choice caveat (community-maintained, not Railway-
      official) and the local-state tradeoff (single-operator, no
      remote backend) — referencing `infrastructure.md`'s Deployment
      section for the full reasoning rather than duplicating it.
