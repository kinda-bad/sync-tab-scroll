---
slug: lyrics-overlay-measure-lines-a
status: backlogged
logged: 2026-07-18
---

Add measure lines and numbers to the in-tab lyrics overlay ticker (lyrics-overlay.ts) — vertical markers at each measure boundary, reusing the tempo/measure-duration math already in lyrics-gap-timing.ts, with the measure number, interleaved into the syllable strip so it's easier to tell where you are in the song. Gated behind a personal preference toggle (like the existing Metronome/Mute-parts toggles in the Preferences settings tab) to turn it on/off, on/off per participant, this-device-only, default off.
