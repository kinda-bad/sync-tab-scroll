---
plan: plan-github-actions-ci-workflow-2026-07-07.md
generated: 2026-07-07
status: in-progress
---

# Tasks

## Phase 1: Workflow file
- [ ] T001 [artifacts: infrastructure] Create `.github/workflows/ci.yml`
  triggering on `push`/`pull_request` to `main`. Steps: `actions/
  checkout@v4`, `pnpm/action-setup@v4` pinned to pnpm major version 10
  (confirm exact locally-installed version via `pnpm --version` and
  match the major), `actions/setup-node@v4` with `node-version: '20'`
  (matching root `package.json`'s `engines.node`) and
  `cache: 'pnpm'`, then `pnpm install --frozen-lockfile`.
- [ ] T002 [artifacts: infrastructure] Add a `pnpm check` step (root
  script, fans out to every workspace package's own `check` script) as
  its own named step, after T001's install step.
- [ ] T003 [artifacts: infrastructure] Add test-suite steps, each its own
  named step so a failure clearly identifies which suite broke: `pnpm
  --filter @sync-tab-scroll/server test`, `pnpm --filter
  @sync-tab-scroll/client test`, `pnpm --filter @sync-tab-scroll/pipeline
  test` (exact `--filter` args confirmed against each `package.json`'s
  own `name` field — already verified as `@sync-tab-scroll/server`/
  `@sync-tab-scroll/client`/`@sync-tab-scroll/pipeline` this session, but
  re-confirm at implementation time in case anything's changed).
- [ ] T004 [artifacts: infrastructure] Add a Playwright browser install
  step (`pnpm exec playwright install --with-deps chromium`, working
  directory `client/` — chromium only, matching this project's
  configured Playwright projects) followed by a `pnpm --filter
  @sync-tab-scroll/client test:ct` step. Do NOT add a `test:e2e` step —
  explicitly out of scope for this pass (plan's Open Questions).
- [ ] T005 Do NOT add a `pnpm check:env` (or equivalent) step anywhere in
  the workflow — confirmed in this plan's Scope/Technical Approach that
  it would always trivially pass in CI (no `.env` present) and provide
  no real protection. This task exists to make the omission a deliberate,
  checked-off decision rather than something a future pass silently
  "fixes" by adding it back without re-reading the reasoning.

## Phase 2: Verification
- [ ] T006 Push this branch to the remote and confirm via `gh run list`/
  `gh run view` (or the GitHub Actions UI) that the workflow actually
  triggers and every step passes — this is the real acceptance test; a
  workflow file that only parses/typechecks isn't sufficient evidence it
  works end-to-end on GitHub's runners.
- [ ] T007 Deliberately introduce one breaking change (e.g. a type error
  in a throwaway line, or a failing test assertion), commit and push it
  to this same branch, and confirm via `gh run view` that the workflow
  actually fails red on the correct step — proving it isn't a silent
  no-op. Then revert the deliberate breakage in a follow-up commit before
  the branch is considered done, and confirm the workflow goes green
  again.
