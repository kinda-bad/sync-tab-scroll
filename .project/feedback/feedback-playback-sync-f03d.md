---
status: planned
created: 2026-07-03
plan: plan-playback-sync-fixes-2026-07-03.md
---

# Feedback

## Bugs
- [x] The persistent Bar's `identity()` snippet (`client/src/App.svelte`) only shows `Join code: {session.code}` in the branch where no song is selected yet (`{#if catalogSong} ... {:else} Join code ... {/if}`). Once a song is selected — which now happens almost immediately via the auto-opening song/part modal — the bar switches to showing song name/artist and the join code disappears from the UI entirely, with nowhere else currently showing it. Confirmed by reading the code, not a guess. Predates the song/part-modal work; the modal just shrank the window where this was visible enough to make it easy to hit. [artifacts: ui]

## Reconsidered
- [x] Manual verification found that playback consistently "rubberbands" back to its starting position instead of advancing — root cause confirmed by reading the code: `server/src/server.ts`'s periodic broadcast refreshes `PlaybackState.serverTimestamp` every tick but never recomputes `tickPosition` during `'running'` status, so the server rebroadcasts the same frozen tick position from whenever playback started/was last seeked. Every client's own alphaTab instance keeps advancing locally in real time, so `correctDrift()` (already correct, unchanged) snaps back to the frozen server value the moment drift exceeds the threshold — repeating forever. This reverses `infrastructure.md`'s current framing that "the server owns... is the source of truth for tick position" — the server can't actually compute this itself (it never parses the GP file, so it has no idea of the song's tempo/tick-rate), so instead: the *host's client* becomes the functional authority, periodically reporting its own real `tickPosition` to the server, which just stores and relays it (unchanged broadcast/correction mechanism on every other client). Latency from host→server→other-clients is accepted as a manageable, minor imprecision for now (consistent with the existing 50-tick drift tolerance and this app's small-scale self-hosted trust model) — `serverTimestamp`-based extrapolation on the receiving end (each client already knows its own tempo, so it could estimate elapsed ticks since the reported timestamp) is a deferred future refinement, not required to ship this fix. [artifacts: infrastructure]
