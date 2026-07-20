---
plan: plan-tempo-stable-drift-threshold-2026-07-20-5d9f.md
generated: 2026-07-20
status: in-progress
---

# Tasks

## Phase 1: Convert The Threshold

- [ ] T001 Add failing unit tests to `client/src/playback-sync.test.ts` asserting that `correctDrift`'s tolerance is **tempo-invariant**: construct scores at 93bpm and 130bpm (the real extremes of the current catalogue) and assert that a drift of a given *real duration* either trips the threshold at both tempos or at neither. These must fail today (constitution Principle VII): the threshold is a fixed 50 ticks, so its real tolerance is `3125 / bpm` ms — 33.6ms at 93bpm versus 24.0ms at 130bpm, a 1.4× spread. Express the test's inputs in milliseconds converted to ticks at the score's tempo, not in raw tick counts, or the test will encode the same tick-thinking it exists to eliminate. A full-suite pre-commit hook runs, so mark the red commit with Vitest's `test.fails` and remove the marker on T002's commit.

- [ ] T002 In `client/src/playback-sync.ts`, replace `const DRIFT_THRESHOLD_TICKS = 50` with `const DRIFT_THRESHOLD_MS = 35` and convert the drift comparison to milliseconds before testing it. `correctDrift` already computes `const tempo = localTempoAtTick(api.score, playbackState.tickPosition)` for its extrapolation, and `ticksToMs(ticks, bpm)` already exists in `client/src/tempo-lookup.ts` — use both rather than introducing a new helper or module. Update the constant's doc comment to explain *why* milliseconds: a fixed tick count is a fixed fraction of a beat, so it silently tightens as tempo rises (backwards), while sync tolerance is a perceptual quantity and therefore absolute. Note the value's derivation: 35ms sits just above the strictest tolerance any current catalogue song receives (33.6ms at 93bpm), so no song gets more corrections than before, and it leaves 15ms of headroom under the 50ms perceptual bar from `research-recording-mode-drift-2026-07-19-b7c2.md` (T004b). Turns T001 green. [artifacts: infrastructure]

- [ ] T003 Update the two existing tests in `client/src/playback-sync.test.ts` whose comments hard-code `DRIFT_THRESHOLD_TICKS(=50)` (around lines 205 and 220). These encode the **old units** — re-express their intent in milliseconds at the score's tempo rather than nudging tick numbers until they pass. A test that still reasons in raw ticks will keep passing while silently asserting the wrong invariant, which is exactly the trap this plan exists to remove. Confirm each still tests what its description claims after the rewrite.

- [ ] T004 Update `.project/artifacts/infrastructure.md`'s Session & Real-Time Sync section, where it currently reads "the 50-tick drift threshold and 'correct only if drift exceeds it' behavior are unchanged" (around line 83). Describe the millisecond tolerance instead, why it is tempo-stable, and the 35ms value with its no-song-gets-tighter derivation. Note the correction *mechanism* is unchanged — only the units of the comparison. Documentation-only; no test requirement. [artifacts: infrastructure]

## Phase 2: Verify No Regression

- [ ] T005 Run the full suite — `pnpm -r test`, client CT, and e2e — plus `pnpm check`. Confirm green with no behavioral change beyond the intended threshold conversion. Any drift-correction test that needed its *expectations* changed (as opposed to its units re-expressed per T003) is a signal that behavior moved further than intended: investigate rather than accept it.

- [ ] T006 Live browser check on the two ends of the real tempo range — Radiohead "Creep" (93bpm, the song whose tolerance loosens most: 33.6 → 35ms) and Silversun Pickups "Lazy Eye" (130bpm, which loosens most in relative terms: 24.0 → 35ms). Run a two-participant session on each and confirm cursor, lyrics ticker, and beat widget still track correctly with no visible drift or stutter. This is the check that matters most: T005 proves the tests agree, this proves a human does. Known environment quirks: Chrome blocks port 6000; automation audio can race or wedge. Verification task — no new automated test required.
