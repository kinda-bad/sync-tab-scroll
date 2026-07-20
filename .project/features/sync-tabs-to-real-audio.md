---
slug: sync-tabs-to-real-audio
status: tasked
logged: 2026-07-19
plan: plan-sync-tabs-to-real-audio-2026-07-19-62cf.md
tasks: tasks-sync-tabs-to-real-audio-cb85.md
---

Sync tab playback (cursor, lyrics ticker, session position) to a real
recording instead of the alphaTab synth: an operator-supplied
`recording.mp3` in the song's catalog dir played via alphaTab's native
`PlayerMode.EnabledBackingTrack`, aligned by alphaTab's own
`MasterBar.syncPoints` (stored as a `syncPoints` field in `meta.json`),
with every participant playing the recording locally and the server/sync
protocol unchanged.
Why: vetted 2026-07-19 (`research-sync-tabs-to-real-audio-2026-07-19-3394.md`)
— strongly positive: alphaTab 1.6+ (installed 1.8.3) already ships
backing-track playback and the tick<->recording-time sync-point model
(Guitar Pro 8's own format), so no bespoke alignment engine or clock
replacement is needed; the host stays clock authority through the same
api surface. MVP excludes YouTube (TOS-encumbered; separate proposal if
ever), in-app sync-point authoring (later phase-2-authoring addition),
and synth+recording mixing (alphaTab can't) — recording mode disables
per-part mute/solo, metronome, and count-in with clear UI, needing a
mode-scoped artifact carve-out of the "full mix audible" decision.
Phase-sized; plan directly with /ardd-plan when wanted.
