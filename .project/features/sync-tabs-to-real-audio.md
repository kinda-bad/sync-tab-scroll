---
slug: sync-tabs-to-real-audio
status: backlogged
logged: 2026-07-19
---

Sync tab playback (cursor, lyrics ticker, session position) to a real recording instead of the alphaTab synth — e.g. a linked YouTube video (as Songsterr does) or an operator-supplied mp3 — with a per-song time-alignment mapping between the recording's timeline and the score's tick timeline.
Why: the synth is a practice aid, but playing along with the actual recording is the real use case; requires solving audio-source licensing/hosting (YouTube embed vs local mp3), a tick<->recording-time alignment map per song (tempo drift in live recordings won't match the score's tempo track), and integration with the existing session playbackState sync (host transport + drift correction currently assume the synth clock). Substantial — vet with /ardd-research before planning.
