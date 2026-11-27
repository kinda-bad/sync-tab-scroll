---
slug: per-song-default-start-point
status: implemented
logged: 2026-11-26
plan: plan-per-song-default-start-point-2026-11-26-5e1d.md
tasks: tasks-per-song-default-start-point-5e1d.md
---

Let a song carry a default start point, so selecting it puts the lobby
cursor there instead of bar 1. The host can still move it or go back to
the top. This should also work in recording mode: playback starts at the
matching moment in `recording.mp3`, mapped through the song's
`syncPoints`.
First user: Smashing Pumpkins – 1979 (Kinda Bad II). The band starts
after the synth intro, which is in a different time signature: bars 1–3
are 4/4, bar 4 is 7/8, and bar 5 is the tab's "Band Entrance" section.
Or they may start just before the vocals: Verse 1 begins at bar 9, and
the first lyric lands in bar 11 (about 0:19). **Assume bar 9** for now
(user, 2026-11-26), pending the user's confirmation. 1979 has no
`recording.mp3` yet, so the recording half needs one first (see
`recordings-for-kinda-bad-ii`).
Likely shape: an optional `defaultStartBar` (or tick) in `meta.json`,
set by hand like the part names, that seeds the song's starting position
when it's selected. Planning needs to confirm which field that is:
`PlaybackState.tickPosition` (where playback actually starts) and/or the
host's pre-playback `lobbyCursorTick`. Open question: does the lyrics
ticker need anything for a mid-song start, such as showing the upcoming
line straight away?
Why: the band never plays 1979's intro, so every run-through starts with
the host scrubbing to the same spot.
Resolved 2026-11-27 (user): bar 9 for 1979. "As long as the default start
marker hasn't been cleared for the session, stop should return there. Host
should control it. It should be clearable." Built as a session start marker
(`Session.startMarkerBar`) seeded from `defaultStartBar` (ui.md Default start
point and start marker).
