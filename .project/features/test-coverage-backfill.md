---
slug: test-coverage-backfill
status: implemented
logged: 2026-07-02
plan: plan-test-coverage-2026-07-02.md
tasks: tasks-test-coverage-bfe8.md
---

Bring the codebase into compliance with constitution Principle VII (Test-First Development): `client` and `packages/shared` have no test runner configured and zero tests; `server` has coverage for only one handler (`spotlight-mode-set`) out of eight.
Why: logged via `/ardd-verify` (see `DEFECTS.md`'s constitution.md entry) — Principle VII was added mid-implementation of `plan-lobby-cursor-modes-2026-07-03.md` specifically because a task needed a test with no runner/harness to write it against. This entry tracks closing the resulting gap deliberately, rather than backfilling it ad hoc.
