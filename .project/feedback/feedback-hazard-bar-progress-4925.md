---
status: planned
created: 2026-07-03
plan: plan-hazard-bar-progress-2026-07-03.md
---

# Feedback

## UX
- [x] The hazard-tape strip's fill during the Playback view is currently hardcoded to `1` (full/"live") rather than tracking real song position — per `App.svelte`'s own code comment, this was a deliberate placeholder ("once actually playing the hazard strip reads as fully 'live' rather than tracking exact song position (which would need alphaTab duration wired through — a later pass)"). Wire real playback position through so the strip actually drains/fills as the song progresses, using alphaTab's `playerPositionChanged` event (already subscribed to elsewhere in `playback-engine.ts` for other purposes), which provides both `currentTime`/`endTime` and `currentTick`/`endTick` — everything needed to compute a real 0-1 progress ratio, no new alphaTab API surface required. [artifacts: ui]
