---
plan: plan-fix-lyric-css-colors-dead-code-2026-07-03.md
generated: 2026-07-03
status: completed
---

# Tasks

## Phase 1: Remove dead export

- [x] T001 [artifacts: constitution] Delete the `lyricCssColors` export and
  its preceding block comment from `client/src/brand-colors.ts` (currently
  lines 19-31: the `/** Plain CSS colors for lyric/cursor DOM overlays...
  */` comment through the closing `};` of the `lyricCssColors` object).
  Leave `darkTabColors` and `lightTabColors` untouched — they're the real,
  actively-consumed `at.model.Color` palettes and are not part of this
  cleanup. No test-first requirement here per constitution Principle VII's
  own exception: this removes an already-unconsumed export with zero
  behavior to exercise (confirmed via `/ardd-verify`'s codebase-wide grep
  finding zero importers) — there is no behavior change for a test to
  cover, only its absence to confirm in T002/T003.

- [x] T002 [artifacts: constitution] [parallel] Run the client typecheck
  (`pnpm --filter client exec tsc --noEmit`, or the project's equivalent
  typecheck script) to confirm removing `lyricCssColors` produces zero
  compile errors — expected outcome given zero importers, but this task's
  job is to actually run it and confirm rather than assume.

- [x] T003 [artifacts: constitution] Run the full existing client test
  suite (unit + component-test, per `playwright-client-coverage`'s
  Playwright setup) to confirm no regression from the deletion. Then
  re-run `/ardd-verify` to confirm `DEFECTS.md` returns to its all-clear
  state (no remaining Principle II violation for `lyricCssColors`), and
  run `/ardd-analyze` to refresh `STATUS.md` afterward.
