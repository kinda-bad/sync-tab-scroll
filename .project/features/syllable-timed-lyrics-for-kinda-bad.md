---
slug: syllable-timed-lyrics-for-kinda-bad
status: implemented
logged: 2026-11-26
---

Add syllable-timed lyrics to the three Kinda Bad songs that only have
line-timed lyrics: Cracker – Low and Jimmy Eat World – Sweetness (Kinda
Bad II), and Silversun Pickups – Lazy Eye (Kinda Bad I). None of their
tabs has lyrics on a vocal track (`lyricsTrackIndex: null` in
`meta.json`), so `extract-lyrics` fell back to lrclib.net, whose
timestamps follow the studio recording rather than the tab and can drift
from its tempo.
The likely route is a vocal track with dispatched lyrics added to each
song's `.gp` (in Guitar Pro or by editing `Content/score.gpif`), then
re-running `extract-lyrics` on it. Afterward, reapply the song's part
names from `docs/catalog-part-names.json` (the pipeline overwrites them)
and record each `.gp` edit in `docs/catalog-patches.md`, since `catalog/`
is gitignored.
Why: the eight songs that have syllable timing from the tab's own vocal
track follow the tab exactly; these three don't.

Done: Sweetness got a raw lyric line on its existing Lead Vocals track
(2026-11-26). Low and Lazy Eye got an appended vocal track built from the
recording's vocal stem, with the line dispatched onto it (2026-11-27). See
`docs/catalog-patches.md` for both.
