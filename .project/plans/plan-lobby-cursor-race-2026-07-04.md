---
status: approved
branch: lobby-cursor-race-4262
created: 2026-07-04
features: []
---

# Plan: Debounce rapid lobby-cursor/seek broadcasts

## Goal

Stop rapid, successive host cursor-set actions (clicking multiple spots on
the tab notation, or repeatedly setting the lobby cursor) from causing
other participants' (and the host's own) alphaTab instance to visibly
flip between each intermediate position — only the final position should
ever be applied.

## Scope

**In scope**: the two host-driven position-broadcast paths that currently
apply every individual update with no coalescing:
1. Native click-to-seek on the tab canvas (`client/src/playback-engine.ts`'s
   `playerPositionChanged` `isSeek` listener → `playback-control` `seek` →
   `server/src/handlers/playback-control.ts`'s `seek` case →
   `session.playbackState.tickPosition` → broadcast → every participant's
   `correctDrift` in `playback-sync.ts`).
2. The explicit "Set lobby cursor" control
   (`client/src/components/SettingsModal.svelte` → `lobby-cursor-set` →
   `server/src/handlers/lobby-cursor-set.ts` → `session.lobbyCursorTick` →
   broadcast → the Spotlight-mode force-follow subscription in
   `playback-engine.ts`, ~lines 140-149).

**Out of scope**: the count-in/metronome/drift-threshold investigation
happening concurrently in this session (different bug, different root
cause, tracked separately in `STATUS.md`) — do not touch
`DRIFT_THRESHOLD_TICKS` or the `playbackState.status === 'running'` branch
of `correctDrift` as part of this plan.

## Technical Approach

**Diagnosed root cause** (confirmed by reading, not reproduced live —
that's for `/ardd-implement`'s own verification step): there is no
debounce/throttle anywhere in either path — confirmed via
`grep -rl debounce\|throttle client/src server/src` returning nothing.
Every individual click or lobby-cursor-set is: sent immediately by the
client, applied as a simple last-write-wins field assignment on the
server (`server/src/handlers/lobby-cursor-set.ts` line 15;
`server/src/handlers/playback-control.ts` line 36), and broadcast
immediately. Every broadcast is then *unconditionally* hard-applied by
every receiving client — `correctDrift`'s drift-threshold branch
(`playback-sync.ts` line 34-38) runs regardless of `playbackState.status`
(so it fires in the Lobby, pre-Start, same as during real playback), and
the Spotlight force-follow block (`playback-engine.ts` line 145-149) has
no debounce either. So a burst of N rapid clicks produces N separate
`session-state` broadcasts, each of which forces a separate hard
`api.tickPosition` reassignment (and alphaTab re-render/scroll) on every
other connected client — visually, this is exactly "the cursor rapidly
switching between spots" instead of settling on the last one, because
every intermediate value gets its own full render before the next one
arrives.

**Fix**: debounce at the send boundary, not the apply boundary — coalesce
to only the *last* position within a short idle window before it's ever
sent over the wire, rather than trying to make every receiving client
drop stale updates (simpler, and avoids adding "is this broadcast stale"
logic to `correctDrift`/the Spotlight subscription, which both already
have enough state-tracking complexity per their existing comments).
Concretely: wrap both send call-sites (`playback-engine.ts`'s seek
listener; `SettingsModal.svelte`'s `setLobbyCursor`) in a small shared
debounce helper (e.g. `client/src/debounce.ts`, trailing-edge, ~150ms)
so a rapid burst of clicks/inputs collapses to one send after the user
stops interacting, before it ever reaches the server or other
participants.

## Phase Breakdown

### Phase 1: Shared debounce helper
- Add `client/src/debounce.ts`: a small trailing-edge `debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T` helper. Write a unit test first (`debounce.test.ts`) confirming only the last call within the window fires, and that it fires exactly once per burst.

### Phase 2: Debounce click-to-seek broadcast
[artifacts: ui] Addresses feedback item: "clicking multiple lobby-cursor positions in quick succession causes the cursor to rapidly flip between spots."
- In `client/src/playback-engine.ts`, wrap the `wsClient.send({ type: 'playback-control', action: 'seek', ... })` call (inside the `isSeek` `playerPositionChanged` listener, ~line 161) with the Phase 1 debounce helper (150ms). Note: `lastProgrammaticTick` guard logic must still see every raw seek event synchronously (it's a same-tick comparison against `correctDrift`'s own assignment) — only the *network send* is debounced, not the local guard check.
- Regression-check against the existing seek-related CT test(s) in `playback-engine.ct.spec.ts` — update if the test asserts a `send` call happens synchronously per seek event.

### Phase 3: Debounce lobby-cursor-set send
[artifacts: ui] Addresses the same feedback item, for the manual "Set lobby cursor" control specifically.
- In `client/src/components/SettingsModal.svelte`, wrap `setLobbyCursor`'s `wsClient?.send(...)` call with the same debounce helper. (Lower priority than Phase 2 — this control requires deliberate manual input + a button click per change, so rapid bursts are less likely here than on the click-to-seek path, but the same fix is trivial to apply for consistency and defense-in-depth.)

### Phase 4: Manual verification
- Live-browser check (two participants): host clicks 4-5 different spots on the tab notation in under a second; confirm the other participant's view settles directly on the last clicked position with no visible intermediate flicker. Repeat for the "Set lobby cursor" input with rapid value changes + clicks.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| New shared `debounce.ts` utility | Two independent call-sites (seek, lobby-cursor-set) need identical coalescing behavior; a tiny shared helper avoids duplicating trailing-edge timer logic twice, consistent with constitution Principle II (No Dead Architecture) favoring one implementation over parallel copies. |

## Open Questions

- Confirm 150ms is the right debounce window — long enough to coalesce a rapid click burst, short enough not to feel laggy for a single deliberate click. Should be tunable if the live-verification pass (Phase 4) finds it feels off.
- Should the debounce delay also suppress the *local* host-side seek visual (i.e., does the host's own view flicker too, or only other participants')? Not established from code reading alone — the host's own `api.tickPosition` is driven directly by alphaTab's native click handling, not by the broadcast round-trip, so the host likely does NOT see their own view flicker (only other participants receiving the broadcasts do) — but this should be confirmed during Phase 4 rather than assumed.

## Production Annotation Summary

None — this is a plumbing fix (debounce a send), not a documented shortcut.
