---
slug: github-actions-ci-workflow
status: tasked
logged: 2026-07-07
plan: plan-github-actions-ci-workflow-2026-07-07.md
tasks: tasks-github-actions-ci-workflow-e421.md
---

A GitHub Actions workflow runs typecheck, the .env/.env.example key-parity lint, and the full test suite (server + client vitest, CT, e2e) on every push and pull request to main.
Why: resolves the deferred CI half of constitution Principle VIII — the env-parity lint already runs pre-commit but nowhere catches a drifted key that slipped past a skipped/bypassed hook; GitHub Actions is the natural provider since the repo already lives on GitHub, no new account/service needed.
