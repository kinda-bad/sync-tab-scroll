# Catalog source-file patches

The `catalog/` tree is gitignored (real commercial `.gp` files), so any
hand-correction made to a source `.gp` file is invisible to git history and
**lost if the file is re-downloaded or restored from its original source**.
This file is the committed record of every such patch, precise enough to
reapply from scratch. If a listed file is ever regenerated/re-fetched,
reapply its patches below before running the pipeline.

## radiohead-creep — `Radiohead-Creep-06-25-2026.gp` (Kinda Bad catalogue)

**Patch 1 — lyric-timing rebalance (applied 2026-07-18).**

*Why:* the tab's vocal transcription is off by one note around the
"do-o-o-o-or" melisma run (bars 58–60), which made the bridge lyrics
("She's / ru-un-ning out / She run, run,") render one bar early (bars
60–62 instead of 61–63) under the corrected GP-semantics lyric dispatch
(`plan-creep-dispatch-2026-07-18-8a7c.md`; empirically proven unfixable
by dispatch rules alone — see `tasks-creep-dispatch-3477.md` T002 notes).
The fix rebalances the raw lyric line only — **no notes/rhythm XML are
touched**, so synth playback is unchanged.

*The edit* (inside the `.gp` zip, file `Content/score.gpif`, Track 0's
`<Lyrics dispatched="true"><Line><Text>` CDATA — the raw lyric line):

1. Insert `+ ` immediately before the bridge's `She's` (the occurrence
   preceding `ru-un-ning`) — i.e. `She's ru-un-ning…` becomes
   `+ She's ru-un-ning…`. This delays that phrase by one singable beat.
2. Delete the **12th standalone `+` hold of the original line** (counting
   every whitespace-delimited `+` token from the start; after edit 1 it is
   the 13th), replacing the token with nothing so its two flanking spaces
   collapse to a double space (`… + …` → `…  …` — the double space is
   load-bearing: it becomes an any-beat skip chunk that keeps the tail
   balanced). Under the current dispatch rules this hold lands in bar 80,
   safely between the user-verified anchors.

*Verification after reapplying* (all user-ear-verified 2026-07-18):
run the pipeline for the song, then check the dispatched stream —
bar 18 = "In a beautiful world" (six syllables), bar 19 empty,
bar 20 opens "I wish I was spe-", "She's"@61, "ru-"@62, "She"@63,
"I don't be-long"@88, "here"@89 on the final vocal note (tick 338400).
The shared test suite's Creep real-file tests
(`packages/shared/src/lyrics-dispatch.test.ts`) cover the non-bridge
anchors; the bridge anchors (61/62/63) only pass with this patch applied.

Zip-editing note: rewrite the zip without macOS AppleDouble `._*` entries
(`COPYFILE_DISABLE=1`, or edit with a script rather than Finder) — stray
AppleDouble files have broken tab loading before (see memory/deploy notes).

## Part names — every song's `meta.json` (applied 2026-11-26)

*Why:* GP track names come in mixed styles (`Ray Toro | Gibson Les Paul |
Lead Guitar`, `Brian - Rhythm Guitar`, `Chirs Bass`). The client's part-name
display (`client/src/part-display-name.ts`) only splits the
`Performer (Instrument)` form, so the other styles showed the whole raw
string on the instrument line. Every part's `instrumentName` was rewritten by
hand to `Performer (Instrument)`, or `Performer (Instrument, Gear)` when the
tab named the gear — the comma part renders on the detail line after the
performer.

*The edit:* `docs/catalog-part-names.json` maps each song directory (relative
to `catalog/`) to its part names in `trackIndex` order. `extract-lyrics`
regenerates `meta.json` from the `.gp` track names, so after re-running it on
a listed song, reapply from the repo root:

```sh
k=kinda-bad/radiohead-creep   # the song's key in the map
f=catalog/$k/meta.json
jq --slurpfile map docs/catalog-part-names.json --arg k "$k" \
  '.parts |= [.[] | .instrumentName = $map[0][$k][.trackIndex]]' "$f" > "$f.tmp" \
  && mv "$f.tmp" "$f"
```

When adding a new song, add its entry to the map in the same form.
