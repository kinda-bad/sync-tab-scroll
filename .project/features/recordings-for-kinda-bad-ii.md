---
slug: recordings-for-kinda-bad-ii
status: implemented
logged: 2026-11-26
---

Get a `recording.mp3` for each of the six Kinda Bad II songs added on
2026-11-26: Arctic Monkeys – Do I Wanna Know?, Cracker – Low, Green Day
– Brain Stew, Jimmy Eat World – Sweetness, Smashing Pumpkins – 1979 and
The All-American Rejects – Dirty Little Secret. Then align each one to
its tab with `syncPoints` in `meta.json` (`sync-tabs-to-real-audio`).
The five Kinda Bad I songs already have recordings.
Upload each to the prod volume as a single song-folder addition, the way
the round-2 songs went up (`COPYFILE_DISABLE=1`, no `._*` files), then
restart the service.
Why: without a recording these songs play only with the synth, and
1979's default start point (`per-song-default-start-point`) needs one
for its recording half.
