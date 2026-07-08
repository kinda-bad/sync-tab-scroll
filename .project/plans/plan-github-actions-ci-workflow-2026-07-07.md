---
status: approved
branch: github-actions-ci-workflow
created: 2026-07-07
features: [github-actions-ci-workflow]
surfaced-defects: [56f2bb95]
---

# Plan: GitHub Actions CI workflow

## Goal

A GitHub Actions workflow runs typecheck and the full test suite on every
push and pull request to `main`, fulfilling the deferred CI half of
constitution Principle VIII.

## Scope

**In scope:**
- `.github/workflows/ci.yml`: triggers on push/PR to `main`; runs `pnpm
  check` (typecheck across all workspace packages) and the full test
  suite (server vitest, client vitest, client CT, `packages/pipeline`
  vitest).
- Playwright browser install step (`chromium` only, matching this
  project's configured projects) ahead of the CT job.
- `infrastructure.md` documentation (already applied this pass).

**Out of scope:**
- Running `pnpm check:env` (the `.env`/`.env.example` key-parity lint) in
  CI — confirmed to always trivially pass there since `.env` is
  git-ignored and never present in a CI checkout (see infrastructure.md's
  new Continuous Integration section for the full reasoning). Only the
  pre-commit hook provides real protection for this specific check.
- Client e2e tests in CI — deliberately deferred to a follow-up, not this
  pass (see Open Questions: e2e's two-webServer setup, including a
  production `vite build` + `preview`, is slower and more failure-prone
  in a fresh CI runner than CT/vitest; worth proving out CI stability
  with the faster suites first).
- Any change to `constitution.md` — Principle VIII's text already
  required CI; this plan fulfills it in code, no wording changes needed.
- Deploying anything, or any release/publish workflow — this is CI
  (checks on push/PR) only, not CD.

## Technical Approach

Standard `pnpm` + workspace monorepo GitHub Actions setup: `actions/
checkout`, `pnpm/action-setup` (pinned to a pnpm major version matching
what's used locally, 10.x), `actions/setup-node` (Node 20, matching root
`package.json`'s `engines.node: ">=20"`) with pnpm store caching, `pnpm
install --frozen-lockfile`, then the check/test steps as separate workflow
steps (not a single combined script) so a failure clearly names which
stage broke in the Actions UI.

The test infrastructure is already CI-aware — `client/playwright.config.
ts`'s `webServer` entries key `reuseExistingServer` off `!process.env.CI`
(GitHub Actions sets `CI=true` automatically), and CT/e2e already target
the committed synthetic fixture catalog
(`client/test-fixtures/fixture-catalog`), not the real gitignored
`catalog/` — so no CI-specific test changes are needed, only the workflow
file itself and the Playwright browser install step.

## Phase Breakdown

### Phase 1 — Workflow file
- [ ] Write `.github/workflows/ci.yml`: checkout, pnpm/Node setup with
  caching, `pnpm install --frozen-lockfile`, `pnpm check` as one step.
- [ ] Add a step running `pnpm --filter server test`, `pnpm --filter
  client test`, and `pnpm --filter @sync-tab-scroll/pipeline test` (or
  equivalent — confirm the exact correct `--filter` package names against
  each `package.json`'s own `name` field during implementation).
- [ ] Add the Playwright browser install step (`pnpm exec playwright
  install --with-deps chromium`, scoped to `client/` — confirm correct
  working directory) ahead of a step running `pnpm --filter client
  test:ct`.

### Phase 2 — Verification
- [ ] Push this branch and confirm the workflow actually runs and passes
  on GitHub (not just locally-reasoned-about) — this is the real
  acceptance test for a CI workflow; a workflow file that merely
  typechecks/parses isn't sufficient evidence it works.
- [ ] Deliberately break one check locally (e.g. a typo introducing a
  type error), push to a scratch branch or this same branch temporarily,
  and confirm the workflow actually fails red — proving it isn't a
  silent no-op. Revert the deliberate breakage before merging.

## Complexity Tracking

None — no new principle deviations; this is infrastructure tooling, not
application architecture.

## Open Questions

- e2e tests are deliberately excluded from this first CI pass (see
  Scope) — revisit once CT/vitest have proven stable in CI for a while;
  a follow-up plan can add the e2e job then.
- Exact pnpm version to pin in `pnpm/action-setup` — use the locally
  installed major version (10.x) as a starting point, confirm during
  implementation whether pinning a specific patch version or just the
  major is preferable (favor major-only, so patch updates don't require
  workflow edits, unless a specific pin proves necessary).

## Production Annotation Summary

None — no production shortcuts introduced.
