---
plan: plan-readme-local-setup-and-gp-ingestion-2026-07-06.md
generated: 2026-07-06
status: in-progress
---

# Tasks

## Phase 1: Getting Started section
- [x] T001 Verify install/prerequisites by actually running them from a
  clean state: `node --version` (repo requires `>=20` per root
  `package.json`'s `engines` field — confirm this is still accurate) and
  `pnpm install` at the repo root. Note the exact pnpm version used
  (`pnpm --version`) if worth pinning in the docs.
- [x] T002 Verify the `.env` setup by actually copying
  `server/.env.example` → `server/.env` and `client/.env.example` →
  `client/.env`, confirming the default `PORT`/`VITE_BACKEND_PORT`
  values match (constitution Principle VIII) and that `pnpm dev` (root
  script) fails or behaves oddly if they're missing/mismatched — note
  the actual observed behavior for the docs.
- [x] T003 Verify running `pnpm dev` from the repo root actually starts
  both the server and client dev servers, and confirm the real default
  client URL/port. Reproduce and document the Chrome port-6000 "unsafe
  port" restriction discovered this session (`client/vite.config.ts`'s
  dev server is hardcoded to port 6000 — Chrome refuses to navigate to
  `localhost:6000` at all) and the workaround (a different browser, or
  running vite directly with `--port <other> --strictPort`).
- [x] T004 Write the "## Getting Started" section into `README.md`
  (placed right after the existing intro paragraph, before the "##
  Datamodel" diagram section), covering T001-T003's verified steps.

## Phase 2: Adding a song section
- [x] T005 [artifacts: pipeline] Verify the `.gp` ingestion CLI end-to-end
  against a real `.gp` file: run `pnpm --filter @sync-tab-scroll/pipeline
  extract-lyrics <path-to-file.gp> <catalogRoot>` (confirm the exact
  invocation — check whether it must be run from `packages/pipeline` or
  works via `--filter` from the repo root) and confirm what it actually
  produces in the catalog directory (meta.json, `.lrc` if lyrics found,
  the published `.gp` file itself).
- [x] T006 [artifacts: datamodel] Write the "## Adding a song" section
  into `README.md`, covering T005's verified command and output, plus a
  brief pointer (not a duplication) to `record-consent` and
  `REQUIRE_SONG_CONSENT` for public-deployment submissions, linking to
  datamodel.md's Consent Record section for detail.

## Phase 3: Running tests section
- [x] T007 Verify the test-suite commands actually run clean: server
  vitest (`pnpm test` in `server/`), client vitest (`pnpm test` in
  `client/`), client CT (`pnpm test:ct` in `client/`), client e2e (`pnpm
  test:e2e` in `client/`). Note exact working-directory requirements for
  each.
- [x] T008 Write the "## Running tests" section into `README.md` covering
  T007's verified commands.

## Phase 4: Final read-through
- [ ] T009 Read through all three new `README.md` sections end-to-end,
  checking no step assumes undocumented prior knowledge (e.g. catalog
  directory structure, what a "song slug" is) and that every command
  shown was actually run and verified in T001-T008, not transcribed from
  memory.
