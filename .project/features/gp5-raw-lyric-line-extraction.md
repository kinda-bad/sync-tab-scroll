---
slug: gp5-raw-lyric-line-extraction
status: implemented
logged: 2026-07-18
plan: plan-widgets-gp5-songswitch-2026-07-18-8bee.md
tasks: tasks-widgets-gp5-songswitch-a046.md
---

Extract the raw track-level lyric line from legacy GP3-5 binary .gp files in the pipeline (the GP5 lyrics block: lyric track number + five {start-measure int32, length-prefixed string} lines near the header) and publish it as meta.json lyricsRawLine/lyricsRawLineStartBar, so GP5 songs (currently only Supermassive Black Hole) get the corrected GP-semantics lyric dispatch instead of the misaligned alphaTab beat.lyrics fallback.
Why: the 2026-07-18 lyrics-dispatch fix (plan-lyrics-dispatch-2026-07-18-8090.md) covers only GP7/8 zips via score.gpif XML; GP5 binaries always store lyrics as a raw line and inherit alphaTab's applyLyrics divergence until this reader exists. Everything downstream (chunker, shared dispatchLyrics, client overlay, .lrc generation) already works off the meta field unchanged.
