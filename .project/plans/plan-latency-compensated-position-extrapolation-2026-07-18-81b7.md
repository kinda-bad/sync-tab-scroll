---
status: approved
branch: latency-compensated-position-extrapolation
created: 2026-07-18
features: [latency-compensated-position-extrapolation]
surfaced-defects: []
---

# Plan: Latency-compensated position extrapolation

## Goal

Compensate a non-host participant's drift-correction comparison for host→server→client propagation latency by projecting the broadcast `PlaybackState.tickPosition` forward using the elapsed time since `serverTimestamp` and the score's local tempo, instead of comparing against the raw last-reported value.

## Scope

**In scope:**
- `client/src/playback-sync.ts`'s `correctDrift()`: project `playbackState.tickPosition` forward by `Date.now() - playbackState.serverTimestamp`, converted to ticks via local-tempo lookup, before computing `drift` against `api.tickPosition`.
- A local-tempo-at-a-given-tick lookup, reused/extracted from `lyrics-gap-timing.ts`'s existing tempo-walk rather than duplicated.
- `infrastructure.md` update (already applied this run).

**Out of scope:**
- Any change to the host's own behavior — the host still never drift-corrects against `playbackState` (unchanged `isHost` guard).
- Any change to the 50-tick `DRIFT_THRESHOLD_TICKS` value or the "correct only if drift exceeds it" policy — this plan changes what's being measured against, not the threshold itself.
- The unrelated in-tab lyrics-ticker syllable-highlight desync reported this session (`feedback-lyrics-ticker-tiro-measure8-9310.md`) — a different mechanism (`lyrics-overlay.ts`'s syllable-tick walk), not touched here.

## Technical Approach

- Extract a small, reusable `localTempoAtTick(score, tick): number` helper from `lyrics-gap-timing.ts`'s existing masterBar-walk logic (currently inlined in `computeGapTiming()`) into a shared location both modules can import — `client/src/tempo-lookup.ts` — rather than duplicating the walk. `lyrics-gap-timing.ts` is refactored to call it; its existing tests continue to pass unchanged (behavior-preserving extraction).
- In `correctDrift()` (`client/src/playback-sync.ts`), before the existing `drift = Math.abs(api.tickPosition - playbackState.tickPosition)` comparison: compute `elapsedMs = Date.now() - playbackState.serverTimestamp`, look up the local tempo at `playbackState.tickPosition` via the new helper, convert `elapsedMs` to ticks (`ticksToMs`'s inverse, using the same `TICKS_PER_QUARTER_NOTE = 960` constant `lyrics-gap-timing.ts` already hardcodes — also moved into the shared `tempo-lookup.ts` module), and add it to `playbackState.tickPosition` to get the extrapolated projection used for the drift comparison and, if drift exceeds threshold, the corrected value applied to `api.tickPosition`.
- `correctDrift()` needs the participant's loaded `score` to look up local tempo — it currently only receives `api`, `playbackState`, `isHost`, `onApply`. `api.score` (alphaTab's own loaded score on the API instance) is the existing, already-available source — no new parameter needed, matching Principle V (check existing idioms before adding surface area).
- The host's own behavior is unaffected — `isHost` continues to return `null` before any of this new logic runs, exactly as today.

## Phase Breakdown

### Phase 1: Extract shared tempo lookup
- T001 — Extract `localTempoAtTick(score, tick)` and the `TICKS_PER_QUARTER_NOTE`/`ticksToMs` constants from `client/src/lyrics-gap-timing.ts` into a new `client/src/tempo-lookup.ts`, behavior-preserving (same masterBar-walk logic, just relocated and parameterized by an arbitrary target tick instead of a `.lrc` gap's `endMs`). Update `lyrics-gap-timing.ts` to import and use it. `[artifacts: infrastructure]` (feature: latency-compensated-position-extrapolation)

### Phase 2: Latency-compensated extrapolation
- T002 — In `client/src/playback-sync.ts`'s `correctDrift()`, add the elapsed-time-to-ticks projection (using `tempo-lookup.ts`'s `localTempoAtTick` against `api.score` and `playbackState.tickPosition`) before the existing drift comparison, replacing the raw `playbackState.tickPosition` comparison value with the extrapolated one. Host behavior (`isHost` early return) stays unchanged. `[artifacts: infrastructure]` (feature: latency-compensated-position-extrapolation)

## Open Questions

- None — the technical approach directly reuses an existing, already-validated tempo-lookup pattern (`lyrics-gap-timing.ts`) and doesn't introduce new user-visible state.

## Production Annotation Summary

Not applicable — constitution.md declares no production-annotation principle.
