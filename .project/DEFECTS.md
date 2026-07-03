# Defects

_Last verified: 2026-07-02_

## constitution.md

- **Claim:** Principle VII (Test-First Development) — "Every code change — client, server, and shared packages alike — is preceded by a test... This applies to the whole codebase, not just new features."
  **Actual:** Test coverage exists only for `server/src/handlers/spotlight-mode-set.ts` (`server/src/handlers/spotlight-mode-set.test.ts`, added the same session this principle was written). Every other server handler (`session-create`, `session-join`, `part-select`, `readiness-update`, `host-remove-participant`, `playback-control`, `lobby-cursor-set`, `song-select`), `session-store.ts`, `connections.ts`, and the entire `client` and `packages/shared` packages have zero test coverage. `client` has no test runner configured at all; `packages/shared` likewise. This is a repo-wide, present violation of the newly-added principle, not a pre-existing condition grandfathered in by it — the principle was written specifically because this gap was hit and had no test infrastructure to fall back on.
  **Location:** `server/src/handlers/*.ts` (all but `spotlight-mode-set.ts`), `server/src/session-store.ts`, `server/src/connections.ts`, all of `client/src/`, all of `packages/shared/src/`
  **Severity:** broken-contract

## Resolved since last verification (2026-07-02)

The following six defects from the prior pass no longer reproduce against current code and are dropped from this report:

- **ui.md** — "Only `start` is wired" is now stale: `client/src/App.svelte` wires `start`/`pause`/`resume`/`stop` (`togglePause()`, `stopPlayback()`), and `client/src/playback-engine.ts:142` sends host-only, paused-only `seek` matching the documented click-to-position behavior exactly.
- **infrastructure.md** (×4) — the "Font & Worker Setup" section now explicitly documents all three deviations (font substitute, `useWorkers`, `scriptFile`), the SoundFont setup has its own paragraph, and the closed-socket `session-state` broadcast is documented under Session & Real-Time Sync. The `mainGlyphColor`/CSS-custom-property mismatch is resolved by the "Revised during implementation" note already present. `infrastructure.md` was brought in line with the code by a prior `/ardd-refine` pass; this pass just confirms it stuck.
- **constitution.md** Principle VI — `client/src/views/Playback.svelte:5` now imports `Theme` from `../tab-renderer` instead of retyping it inline.
- **constitution.md** Principle II — `client/src/brand-colors.ts`'s unused `.geometry` fields have been removed from both `darkTabColors` and `lightTabColors`.
