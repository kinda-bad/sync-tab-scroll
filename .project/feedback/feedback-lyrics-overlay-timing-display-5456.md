---
status: planned
created: 2026-07-14
plan: plan-7f0f-2026-07-14-67d9.md
---

# Feedback

## Bugs
- [x] F001 Lyrics overlay highlight timing runs ~2 syllables ahead of actual playback position. Appears consistent (not growing) throughout a song; confirmed on both TIRO and Creep. Mechanism/cause unknown — not confirmed whether tied to audio cursor, tab cursor, or an independent timer. [artifacts: ui]
- [x] F002 The "lobby" display and lyrics panel each render their own distinct vertical scrollbar, and the lobby display never fully scrolls out of view. [artifacts: ui]
- [x] F003 The pause "drain" bar indicator doesn't disappear after the pause ends — persists after doing its job. [artifacts: ui]
- [x] F004 Count-in dots don't disappear after the count-in finishes. [artifacts: ui]
- [x] F005 The first lyric line starts out already highlighted; it should wait until playback actually reaches it before highlighting. [artifacts: ui]

## UX
- [x] F006 Count-in dots currently render as a separately positioned indicator above the related line, which reads in the wrong order. Proposed redesign: render the dots as an inline prefix to the upcoming lyric line (e.g. "···· You will be"), resolving into the highlighted lyric as playback reaches it. [artifacts: ui]
