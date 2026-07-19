---
status: planned      # open -> planned
created: 2026-07-18
plan: plan-widgets-gp5-songswitch-2026-07-18-8bee.md
---

# Feedback

Context: user report, live local session, 2026-07-18 (immediately after the
lyrics-dispatch merge `e37437d`, which touched `client/src/playback-engine.ts`
for the raw-line overlay wiring — timing makes a fresh regression plausible
but unconfirmed; could equally be a pre-existing song-switch race).

## Bugs

- [x] F001 Switching songs mid-session left the client on stale state
  twice over: the tab view rendered was the wrong one (not the newly
  selected song's), and starting playback played the *previous* song's
  audio — i.e. neither the alphaTab renderer nor the synth/player had
  actually loaded the new score. A full browser refresh fixed it, after
  which the same switch worked. Not yet reproduced/diagnosed: unknown
  whether it is a race in the song-change path (score load vs. render vs.
  player load ordering in `client/src/playback-engine.ts` /
  `tab-renderer`), a regression from the 2026-07-18 raw-line wiring
  change in `playback-engine.ts`, or a longer-standing latent race that
  this session happened to hit. Repro details not captured (which songs,
  host vs. participant, how quickly the switch followed the previous
  playback) — first diagnostic step is a live repro attempt with the
  console open. [artifacts: infrastructure, ui]
