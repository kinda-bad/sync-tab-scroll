---
slug: check-timing-for-every-song
status: implemented
logged: 2026-11-26
---

Play through every catalog song and check its timing: lyrics against
the tab (syllable timing on the eight songs with a vocal-track source,
line timing on the lrclib.net ones), and, for songs with a
`recording.mp3`, the cursor and lyrics against the recording via
`meta.json`'s `syncPoints`. Fix what's off, by patching the `.gp` lyric
line (as with Creep in `docs/catalog-patches.md`) or adjusting sync
points, and record each fix in `docs/catalog-patches.md`.
Covers all 12 songs: Kinda Bad I (5), Kinda Bad II (6) and the default
catalogue's Supermassive Black Hole. The six Kinda Bad II songs added on
2026-11-26 have never been checked by ear.
Why: timing has only been ear-verified song by song as problems were
found (Creep, 2026-07-18); there's been no full pass, and the catalog
just doubled.

Done 2026-11-27. Fixes are recorded in `docs/catalog-patches.md`:
- sync points from recordings, for all 12 songs;
- lyric patches for Creep, Teenagers, 1979, Do I Wanna Know, Dirty Little
  Secret, Sweetness and Brain Stew;
- CBR re-encodes, which fix inaccurate seeking.

Known leftovers, accepted for now:
- Creep "But"/"What" are sung over rests.
- Dirty Little Secret's pass 2 of bars 90–92 shows pass 1's words, which
  would need per-pass lyrics.
- Steady offsets in Time Is Running Out bars 85–97 and Teenagers bars 25–40
  may be a sync check.
