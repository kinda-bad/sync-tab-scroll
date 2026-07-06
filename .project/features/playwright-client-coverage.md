---
slug: playwright-client-coverage
status: implemented
logged: 2026-07-02
plan: plan-playwright-coverage-2026-07-02.md
tasks: tasks-playwright-coverage-c1d3.md
---

Covers `client`'s DOM/alphaTab/WebSocket-coupled modules (`tab-renderer`, `headless-player`, `lyrics-overlay`, `playback-engine`, `ws-client`, `store`, `main`) with Playwright, completing the Principle VII backfill that `test-coverage-backfill` explicitly left out.
Why: `jsdom` can't render alphaTab's canvas/SVG output or play audio, and heavy mocking risks testing the mock instead of the real behavior — `plan-test-coverage-2026-07-02.md`'s Open Questions flagged this as needing its own deliberately-scoped plan rather than folding it into the vitest pass.
