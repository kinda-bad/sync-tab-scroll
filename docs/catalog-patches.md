# Catalog source-file patches

The `catalog/` tree is gitignored (real commercial `.gp` files), so any
hand-correction made to a source `.gp` file is invisible to git history and
**lost if the file is re-downloaded or restored from its original source**.
This file is the committed record of every such patch, precise enough to
reapply from scratch. If a listed file is ever regenerated/re-fetched,
reapply its patches below before running the pipeline.

Re-running `extract-lyrics` into a song's own folder keeps the hand-set
`meta.json` fields: part names, `name`, `syncPoints`, `defaultStartBar`, and
`lyricLineBreaks` while they still fit (`.project/artifacts/pipeline.md`,
"Re-running on an existing song"). The "reapply part names / sync points"
steps below are only needed when `meta.json` is rebuilt from scratch, for
example after extracting into an empty directory and copying `meta.json`
back. A `.gp` patch that moves words between lines but keeps the line count
and syllable total would keep the old breaks, so delete them first
(`jq 'del(.lyricLineBreaks)'`) when the patch means to regenerate them.

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

**Patch 2 — pickup words moved off held notes (applied 2026-11-27).**

*Why:* with the recording sync points in place, a forced alignment of the
Demucs vocal stem showed seven lines whose first word was shown 1.8–4 s
(about 1–1.5 bars) before it was sung, while the rest of the line was right:
bar 41 "When", bar 45 "I", bar 47 "But", bar 48 the second "I'm", bar 51
"What", bar 53 "I" and bar 55 "ooh". The user heard the same thing. Each time
the word took the last note of the previous phrase: a fresh, untied note
(a melisma tail, or the attack of a note tied into a long hold) right after
the phrase's last syllable. In the recording that note is still the previous
word, and the next word is sung just before the next phrase's first note,
over what the tab writes as a rest. Bar 76 "want" was the other way round:
it is sung on the tie that holds the word before it in bar 74 (tick 284160),
so the dispatcher skipped to the next fresh note, the pickup before "You're"
in bar 76, 3.65 s late. The dispatch rules are right here (tie destinations
and rests are not sung attacks); the tab's rhythm is the problem. The fix
rebalances the raw lyric line only. **No notes or rhythm XML are touched**,
so synth playback is unchanged.

*The edit* (same CDATA as Patch 1: `Content/score.gpif`, Track 0's
`<Lyrics dispatched="true"><Line><Text>`, applied on top of Patch 1).
Occurrences count whitespace-delimited tokens of the Patch 1 line, matched
exactly (case and punctuation included), from the start:

1. Seven merges. For each word below, append ` +` to the end of the token
   just before it (before the newline when the word starts a line), and
   replace the single space after the word with `+`, joining it to the
   following word. The hold keeps the previous word sounding on the note it
   used to take, and the joined pair lands together on the next phrase's
   first note. Net chunk count is unchanged, so nothing downstream moves.
   - `When`, 2nd of 2 (starts a line; bar 41 → 42, tick 155280 → 159120)
   - `I`, 10th of 18 (starts a line; bar 45 → 46, 169440 → 174240)
   - `But`, 2nd of 3 (starts a line; bar 47 → 48, 177120 → 182160)
   - `I'm`, 5th of 7 (mid-line; bar 48 → 50, 183840 → 190080)
   - `What`, 2nd of 3 (starts a line; bar 51 → 52, 193680 → 197120)
   - `I`, 13th of 18 (starts a line; bar 53 → 54, 199680 → 205440)
   - the token just before the 4th of 4 `want` is joined to it the same way
     (`…+want`), and ` +` is appended **after** `want` instead (before the
     newline) so the bar 76 pickup is held. "want" moves 289680 → 283680.
2. The two ooh's (one token, `o-oh,`, 1st of 1, then the next `o-oh`, bar
   55–56): append ` +` to the token before `o-oh,`, and delete the 12th
   standalone `+` of the Patch 1 line (it starts the line after the second
   ooh) together with the single space after it. Both ooh's move one note
   later: the first from 207840 to 210720, the second from 211680 to 212760.
   The deleted hold's note (213600) now carries the second ooh's last
   syllable. (Patch 1's step 2 counts holds on the original line, so the hold
   numbering there is unaffected. After Patch 2 the line has 22 standalone
   `+` tokens.)
3. `meta.json` `lyricLineBreaks` becomes the real per-line syllable counts,
   `[6,7,6,5,8,6,6,6,8,9,5,6,6,7,6,7,4,6,5,6,8,8,13,5,8,5,7,4,6,6,8,9,5,5]`
   (sum 222, the dispatched syllable count). `extract-lyrics` computes this
   with `countSyllables`, which counts line 16's three-dash melisma
   syllable as three syllables. That gives `…,9,…` for line 16 and a sum of
   224, so every line from 17 on starts two syllables late. This was already
   wrong before Patch 2 (231 against 229), but merged chunks would have
   pulled one more word onto the previous line. Then `lyrics.lrc` is rebuilt
   from these breaks; its text stays the same.

The patched CDATA is 943 characters (Patch 1: 929). sha256:
Patch 1 line `0e6265581b99cf0e67e581b077c06d001513ad89d14f4df6abd533327a2648c7`,
Patch 2 line `3d56a74d35cef0338e11750b8aa73c822559b168a1e6cadf5307d38688f78053`.
The exact text is not reproduced here. Its canonical copy is the patched
file's CDATA, which the pipeline mirrors into `meta.json`'s `lyricsRawLine`.
`catalog-originals/kinda-bad/radiohead-creep/` holds the Patch 1 state
(`.gp`, `meta.json`, `lyrics.lrc`). It is not the unpatched original, which
is the song folder's `.gp.bak-prepatch`.

*Reapplying,* from the repo root, given the Patch 1 file:

```sh
d=catalog/kinda-bad/radiohead-creep; g="$d/Radiohead-Creep-06-25-2026.gp"
jq -j .lyricsRawLine "$d/meta.json" > /tmp/creep-p1.txt   # must hash to the Patch 1 sha256 above
# write /tmp/creep-p2.txt by applying steps 1–2 to a copy; it must hash to the Patch 2 sha256
python3 -I tools/catalog-patches/gp-replace-raw-line.py "$g" 0 /tmp/creep-p1.txt /tmp/creep-p2.txt /tmp/creep.gp
mkdir -p /tmp/creep-src /tmp/creep-out && cp /tmp/creep.gp "/tmp/creep-src/$(basename "$g")"
(cd packages/pipeline && npx tsx src/extract-lyrics.ts "/tmp/creep-src/$(basename "$g")" /tmp/creep-out)
cp /tmp/creep-out/radiohead-creep/{meta.json,lyrics.lrc} "$d/" && cp /tmp/creep.gp "$g"
```

Then reapply part names and sync points (sections above, key
`kinda-bad/radiohead-creep`), set step 3's `lyricLineBreaks` with `jq`, and
rebuild the LRC:

```sh
jq '.lyricLineBreaks = [6,7,6,5,8,6,6,6,8,9,5,6,6,7,6,7,4,6,5,6,8,8,13,5,8,5,7,4,6,6,8,9,5,5]' \
  "$d/meta.json" > "$d/meta.json.tmp" && mv "$d/meta.json.tmp" "$d/meta.json"
(cd packages/pipeline && npx tsx ../../tools/catalog-patches/rebuild-lrc.ts "$PWD/../../$d" - "$PWD/../../$d/lyrics.lrc.new") \
  && mv "$d/lyrics.lrc.new" "$d/lyrics.lrc"
```

Compared with the Patch 1 `meta.json`, only `lyricsRawLine` and
`lyricLineBreaks` differ.

*Verification after reapplying* (2026-11-27):
- Dispatching the Patch 1 and Patch 2 lines on the same score, word by word
  (merged chunks split on spaces), gives the same 229 words. Only the 11
  listed above change tick, and every other word keeps its tick. Beats
  consumed stay 421 of 425.
- All Patch 1 anchors hold: bar 18 six syllables, bar 19 empty, bar 20
  opens "I wish I was spe-", "She's"@61, "ru-"@62, "She"@63,
  "I don't be-long"@88, "here"@89 on tick 338400. The shared Creep
  real-file tests pass (4 of 4, 16 of 16 in `lyrics-dispatch.test.ts`), and
  so do the pipeline tests.
- Against the vocal-stem alignment (sung minus shown, recording sync points):
  When +2358 → −312 ms, I (45) +3041 → −259, But +2924 → −542, I'm (48)
  +3947 → −343, What +1825 → −540, I (53) +3724 → −100, ooh +2209 → +297,
  second ooh +461 → −256 (low confidence), want −3654 → +329. Confident
  words (score ≥ 0.3) off by more than half a beat (323 ms): 12 → 8. No
  other word changed.
- Left as they are: "But" and "What" are sung about 0.5 s before the note
  they now share, over a written rest, and "want" is sung on a tie
  destination. Getting closer would take a `.gp` rhythm edit: a rest split
  into a pickup note before bars 48 and 52, or the tie at 284160 removed.
  Each would need a compensating hold, and the synth playback would change.
  The low-confidence bar 12 "angel" (+330), bar 73 "happy" (−473) and bars
  77/79 "special" (−376/−641) look like the same tie-destination pattern and
  are not changed.

**Patch 3 — bridge melisma shortened, late second syllables pulled in (applied 2026-11-27).**

*Why:* the user, listening with Patch 2, heard both drawn-out "ru-u-u-un"
runs in the bridge last too long. The first one's "un" belongs in bar 67 and
the second's in bar 71. It also heard "py" (hap-py, bar 73) and both "cial"
(spe-cial, bars 77 and 79) late. The tab puts the first run on four chunks
(`ru-`, `u-`, `u-`, `un`) over only three fresh notes, so its "un" took the
next fresh note, the bar 69 pickup (261120). That pushed the whole second run
one note late: its "un" landed on the bar 72 pickup (274320). The three late
syllables are a separate fault, the same one as Patch 2's "want". The singer
re-attacks a note the tab ties: "hap-" on 276480, the first "spe-" on 291840
and the second on 299520. All three are tie destinations, so the dispatcher
skips each one, and the second syllable lands on the next phrase's pickup
note. Shortening the run doesn't fix them, so they need their own edits.
**No notes or rhythm XML are touched.**

*The edit* (same CDATA, on top of Patch 2). Occurrences count
whitespace-delimited tokens of the Patch 2 line, matched exactly:

1. The first run is a single token, `ru-` followed by `u-` twice and then
   `un` (1st such token). Delete one `u-` from it, leaving `ru-` `u-` `un`.
   Its "un" moves 261120 → 252800, the last note of the run: a bar 66 note
   tied into bar 67. The second run (token `Ru-` `u-` `u-` `u-` `un`, 1st of
   1) moves one note earlier and now starts on the bar 69 pickup (261120). Its
   "un" moves 274320 → 268320, the bar 70 note tied into bar 71. Append ` +`
   after that token (before the newline) to hold the bar 72 pickup, so the
   next line is unchanged.
2. `hap-py` (1st of 1): replace the space before it with `+`, joining it to
   the word before it, and append ` +` after it (before the newline). The
   joined chunk keeps the earlier word's note (276000) and now carries
   "hap-" too. "py" moves 282000 → 276960, and the hold takes the bar 74
   pickup.
3. `spe-cial`, 5th and 6th of 6 (bars 77 and 79): the same edit as step 2.
   "spe-" joins the earlier word's note (291360 and 299040), "cial" moves to
   292320 (was 297120) and to 300000 (was 305040), and the holds take the
   bar 78 and bar 80 pickups.
4. `meta.json` `lyricLineBreaks` becomes the real per-line counts again
   (see Patch 2 step 3):
   `[6,7,6,5,8,6,6,6,8,9,5,6,6,7,6,7,4,6,5,6,8,8,13,5,7,5,6,4,5,5,8,9,5,5]`
   (sum 218, the dispatched syllable count). `extract-lyrics` gives the same
   array except line 16 = 9. Then `lyrics.lrc` is rebuilt from these breaks.

The patched CDATA is 949 characters with 26 standalone `+` tokens. sha256:
Patch 2 line `3d56a74d35cef0338e11750b8aa73c822559b168a1e6cadf5307d38688f78053`,
Patch 3 line `f5cce4f24e45151c8aaccffa4e1c42b038a3cb2340486d2eab974456567c0fc8`.

*Reapplying,* from the repo root, given the Patch 2 file: the same commands
as Patch 2. Hash-check the current `lyricsRawLine` against the Patch 2
sha256. Write the Patch 3 line from steps 1–3 and check its hash. Run
`gp-replace-raw-line.py` with `0 <p2.txt> <p3.txt>`, then run `extract-lyrics`
on a copy outside the song folder and copy back `meta.json` and `lyrics.lrc`.
Reapply the part names and sync points. Finally, set step 4's
`lyricLineBreaks` and run `rebuild-lrc.ts "$d" -`. Compared with the Patch 2
`meta.json`, only `lyricsRawLine` and `lyricLineBreaks` differ.

*Verification after reapplying* (2026-11-27):
- Dispatching the Patch 2 and Patch 3 lines on the same score, word by word,
  with merged chunks split on spaces: the only words that move are the 12
  syllables listed above (the dropped `u-` aside). Every Patch 2 placement
  keeps its tick, including all the pickup words and "want". The last
  syllable stays on tick 338400.
- The Patch 1 anchors hold (bar 18, bar 19 empty, bar 20, "She's"@61,
  "ru-"@62, "She"@63, bars 88/89). The shared Creep real-file tests pass
  (4 of 4), and so do the pipeline tests (33 of 33).
- Against the vocal-stem alignment (sung minus shown): "happy" −473 → +164 ms,
  bar 77 "special" −376 → +273, bar 79 "special" −641 → +20. The
  alignment's words are whole words, so it can't time "un" or "py"/"cial"
  separately. The stem's pitch track has the first run reaching its last
  pitch at the end of bar 66 and holding it through half of bar 67, which
  fits "un" on the tied note. Confident words (score ≥ 0.3) off by more than
  323 ms: 8 → 5. No confident word got worse.
- Not done: "un" now starts on the note tied *into* bars 67 and 71, 2/3 and
  1/2 beat before those barlines. Starting it on the downbeat would take a
  `.gp` edit (untie 253440 and 268800, plus one more `u-` in the second run
  and a hold). The raw line can't express it. Do it only if the user still
  hears "un" early.

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
to `catalog/`) to its part names in `trackIndex` order. Re-running
`extract-lyrics` keeps these names as long as the same GP track is still at
each index (`.project/artifacts/pipeline.md`, "Re-running on an existing
song"). Reapply only when rebuilding a song's `meta.json` from scratch, or
for a track whose GP name changed, from the repo root:

```sh
k=kinda-bad/radiohead-creep   # the song's key in the map
f=catalog/$k/meta.json
jq --slurpfile map docs/catalog-part-names.json --arg k "$k" \
  '.parts |= [.[] | .instrumentName = $map[0][$k][.trackIndex]]' "$f" > "$f.tmp" \
  && mv "$f.tmp" "$f"
```

When adding a new song, add its entry to the map in the same form.

## Default start bar — `defaultStartBar` in `meta.json` (applied 2026-11-26)

*Why:* some songs are never played from bar 1. For 1979 the band skips the
synth intro, so every run-through used to start with the host scrubbing to
the same spot. An optional `defaultStartBar` in a song's `meta.json` sets
the session's start marker when the song is picked, so everyone is parked at
that bar instead of bar 1, and every Stop returns there. During a session the
host can move or clear the marker (Settings, Session tab, "Start marker"),
or click anywhere in the tab before Start, bar 1 included. That never
changes `meta.json`: the next session, or picking the song again after
another one, starts from `defaultStartBar` again. See
`.project/artifacts/ui.md` "Default start point and start marker".

*The value:* a 1-based bar number, as the tab numbers its bars (bar 1 is the
first bar). It must be a positive integer. Anything else (`0`, `2.5`, `"9"`)
is logged at server startup and ignored, and the song still loads. A bar
past the end of the score is ignored too. With repeats, the start is the
bar's first time through.

| Song (relative to `catalog/`) | `defaultStartBar` | Lands on |
|---|---|---|
| `kinda-bad-ii/smashing-pumpkins-1979` | `9` | "Verse 1", just before the first lyric in bar 11 (confirmed by the user, 2026-11-27). |

*The edit:* re-running `extract-lyrics` keeps this field. Reapply it only
when rebuilding the song's `meta.json` from scratch (from the repo root):

```sh
f=catalog/kinda-bad-ii/smashing-pumpkins-1979/meta.json
jq '.defaultStartBar = 9' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
```

To remove it: `jq 'del(.defaultStartBar)'`. The server reads `meta.json` at
startup (and on an authoring rescan), so restart it after an edit. On the
Railway deployment, the volume's copy of the file needs the same edit.

## Recording sync points — Creep, Last Nite, Teenagers `meta.json` (applied 2026-11-26)

*Why:* these recordings had only two placeholder sync points (bar 1 at the
start of the mp3, the last bar at its end), so the tab was stretched
linearly over the recording and lyrics drifted from the singing by up to
1–2.3 s. The new points come from force-aligning the lyrics against the
Demucs vocal stem (one anchor per 8 bars, at the median sung-vs-shown
offset), with bar 1 taken from the instrumental onset (Creep, Last Nite).
Teenagers' recording starts partway into its pickup bar, so its first point
is bar 1 at `barPosition` 0.5166, 0 ms.

*Last Nite update (2026-11-27):* its original `recording.mp3` turned out to
be a live recording. It was replaced with the studio recording (the live one
and its meta.json are kept in the gitignored
`catalog-originals/kinda-bad/the-strokes-last-nite/`). The studio take holds
the tab's tempo (a fitted 103.99 bpm against the notated 104), so its entry is
just two points from a straight-line fit of the sung word starts (consonant
words only, since the aligner places vowel-initial words late): bar 1 at
450.2 ms and the end of bar 85 at 196628.2 ms. The median residual is 40 ms,
and no word is off by more than half a beat. The end point lies past the end of
the mp3 (193.4 s); the tab's last bar rings out beyond the recording.

*The edit:* `docs/catalog-sync-points.json` maps each song directory to its
full `syncPoints` array. Re-running `extract-lyrics` keeps them. Reapply only
when rebuilding a song's `meta.json` from scratch, from the repo root:

```sh
k=kinda-bad/radiohead-creep
f=catalog/$k/meta.json
jq --slurpfile m docs/catalog-sync-points.json --arg k "$k" \
  '.syncPoints = $m[0][$k]' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
```

## jimmy-eat-world-sweetness — `Jimmy Eat World-Sweetness-09-20-2026.gp` (Kinda Bad II catalogue)

**Patch 1 — syllable-timed lyrics on the Lead Vocals track (applied 2026-11-26).**

*Why:* track 0 ("Jim Adkins | Lead Vocals") has vocal notes from bar 1 but no
lyrics, so `extract-lyrics` fell back to lrclib and the song only had
line-timed lyrics following the studio recording, not the tab
(`.project/features/syllable-timed-lyrics-for-kinda-bad.md`). The fix adds a
raw lyric line to track 0. **No note or rhythm XML is touched**, so synth
playback is unchanged.

*The edit* (inside the `.gp` zip, file `Content/score.gpif`): fill Track 0's
first `<Lyrics dispatched="true"><Line><Text>` CDATA (empty in the source
file; `<Offset>` stays `0`). The line is built from the lrclib LRC the song
used before this patch, with one raw line per LRC lyric line (41 lines; the
LRC's blank lines are dropped). Because the raw line has more than one line,
`extract-lyrics` takes its line breaks from it and does not query lrclib.
The exact text is not reproduced here (copyrighted lyrics). Its canonical
copy is the patched file's CDATA, which the pipeline mirrors into
`meta.json`'s `lyricsRawLine`.

How the LRC text was fitted to the notes. Line numbers are the original LRC's
file lines, and the tab has no repeats or jumps:

1. Words are syllabified with `-`. The parentheses and punctuation are kept
   as the LRC has them, and so are the hyphenated "oh-oh-oh-oh" runs.
2. A trailing ` +` hold (one extra note after the phrase) on lines 1, 2, 6,
   9, 11, 12, 19, 21, 36, 37, 39. Each "whoa oh-oh-oh-oh" phrase except those
   on lines 25 and 27 has one more note than syllables.
3. 40 trailing `+` holds on line 22: the bridge, bars 57–72, is 8 × 5 vocal
   notes with no lyric in the LRC. 3 more trailing holds on line 39: the three
   unlyricked eighth notes in bar 105 before line 40.
4. Echo lines with one note too few:
   - Line 4: the last word is unhyphenated (one chunk).
   - Line 14: the last two words are joined with `+`.
   - Line 17: the last word is unhyphenated.
   - Line 30: the last word is unhyphenated.
5. Lines 26 and 28 ("…, are you listening?" echoes):
   - Line 26: the final word is split into 2 chunks (first syllable + rest).
   - Line 28: the final word is one chunk.
6. Line 29: the first three words are joined with `+` onto one note. Bar 85
   beats 3 and 3.5, where the lead's pickup really falls, are chords that
   contain a tie destination, which the dispatcher treats as unsingable.
7. Lines 31 and 32: words 2–4 are joined with `+`. The lead's two syllables
   keep their own notes, and the untranscribed echo shares the second note.

*Reapplying:* the edit is mechanical once you have the line. Either copy the
CDATA from a patched copy of the file, or regenerate it from the
**original lrclib LRC**, kept with the unpatched `.gp` in the gitignored
`catalog-originals/kinda-bad-ii/jimmy-eat-world-sweetness/` (local only, like `catalog/`). The generator's `SPEC` is keyed on that file's line
numbers, and `extract-lyrics` overwrites `lyrics.lrc` with GP-derived text, so
it can't be run against the regenerated file. Then:

```sh
node tools/catalog-patches/sweetness-build-raw-line.mjs \
  catalog-originals/kinda-bad-ii/jimmy-eat-world-sweetness/lyrics.lrc raw-line.txt
python3 -I tools/catalog-patches/sweetness-patch-gp.py \
  "catalog-originals/kinda-bad-ii/jimmy-eat-world-sweetness/Jimmy Eat World-Sweetness-09-20-2026.gp" raw-line.txt "<out dir>/Jimmy Eat World-Sweetness-09-20-2026.gp"
# publishSong copies the .gp into the song folder, so run from a copy outside it
# (copying a file onto itself can truncate it):
pnpm --filter @sync-tab-scroll/pipeline extract-lyrics \
  "<out dir>/Jimmy Eat World-Sweetness-09-20-2026.gp" "$PWD/catalog/kinda-bad-ii"
```

The patch script rewrites the zip entry by entry, so no AppleDouble `._*`
entries appear. `extract-lyrics` keeps the part names. If `meta.json` was
rebuilt from scratch, reapply them (see "Part names" below). This song's key
there is `kinda-bad-ii/jimmy-eat-world-sweetness`.

*Verification after reapplying* (2026-11-26):
- `findLyricsSource` → track 0, line 0.
- 303 syllables expected (`countSyllables` over the 41 lines) and 303
  dispatched. The word sequence matches the LRC exactly.
- The last syllable is at tick 438720 (bar 115). The last vocal note is the
  tie into bar 116, so nothing spills.
- Bars with vocal notes but no syllable are only holds and ties: 8, 24, 32,
  48, 56, the bridge 57–72, 112 and 116.

Line start bars, by LRC line:

| LRC lines | Start bars |
|---|---|
| 1–8 | 1, 6, 9, 10, 11, 13, 14, 15 |
| 9–16 | 17, 21, 25, 30, 33, 34, 35, 37 |
| 17–22 | 38, 39, 41, 45, 49, 54 |
| 24–30 | 74, 77, 80, 82, 84, 85, 86 |
| 31–37 | 87, 88, 89, 90, 91, 92, 93 |
| 38–42 | 97, 101, 105, 109, 113 |

Tab time minus LRC time stays between −0.26 s (line 1) and +1.89 s. From one
line to the next it never moves more than 0.9 s, which is under one bar.


## Recording sync points — Lazy Eye `meta.json` (applied 2026-11-27)

*Why:* Lazy Eye still had the two placeholder points (bar 1 at 1 ms, the end
of bar 187 pinned to the end of the mp3, which includes about 1 s of tail).
The record plays a steady 127.115 bpm (1888.06 ms/bar), while the placeholders
stretched the tab to 1893.7 ms/bar. The cursor was therefore 77 ms early at
bar 1 and about 1 s late by bar 187. The new points come from a constant-tempo
grid fitted to the Demucs instrumental stem: bar 1 at 78.0 ms (the first
audible onset), the end of bar 187 at 353145.2 ms. Before the fix the
cross-correlation lags between repeated sections grew by about 5.6 ms per bar;
after it they are 0 ±5 ms.

*The edit:* the song's entry in `docs/catalog-sync-points.json`
(`kinda-bad/silversun-pickups-lazy-eye`). Reapply it the same way as the other
songs' points (see "Recording sync points" above):

```sh
k=kinda-bad/silversun-pickups-lazy-eye
f=catalog/$k/meta.json
jq --slurpfile m docs/catalog-sync-points.json --arg k "$k" \
  '.syncPoints = $m[0][$k]' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
```

## silversun-pickups-lazy-eye — `lyrics.lrc` (Kinda Bad catalogue)

> **Superseded (2026-11-27)** by "Vocal tracks for Low and Lazy Eye" below:
> `lyrics.lrc` is now GP-derived from the new vocal track. The re-timed LRC
> is kept in `catalog-originals/<collection>/<song>/pre-vocal-2026-11-27/`;
> don't reapply a re-time on top of the current file.

**Patch 1 — line start times re-timed against the vocal stem (applied 2026-11-27).**

*Why:* the tab has no lyrics, so `lyrics.lrc` is lrclib's synced LRC passed
through unchanged (`passthroughLrc`). 14 of its 26 lyric lines start 0.2–3.8 s
away from where they are sung. The worst is file line 10, which lrclib put
0.19 s before the next line; it is really sung 3.8 s earlier. The new times
are the sung starts measured by force-aligning the LRC text against the Demucs
vocal stem, with vowel-initial line starts corrected by −140 ms for the
aligner's measured vowel bias. Only start times of lyric lines change. The
text, the 11 blank lines and the line count (37 file lines) stay the same.
Lines the aligner wasn't confident about are left as lrclib had them.

The times stay in **recording time**, like every lrclib-sourced LRC. They
display correctly only once the client converts lrclib-sourced LRC times to
tab time through the song's sync points. Until then, line highlighting follows
the notated timeline and runs late as the song goes on.

*The edit:* set these file lines' timestamps (1-based line numbers of
`lyrics.lrc`; text after the `]` is untouched):

| File line | lrclib | Patched |
|---|---|---|
| 2 | 00:36.43 | 00:37.11 |
| 4 | 00:43.54 | 00:43.89 |
| 7 | 00:55.49 | 00:55.88 |
| 10 | 01:22.20 | 01:18.41 |
| 12 | 01:28.56 | 01:28.78 |
| 13 | 01:33.14 | 01:33.54 |
| 14 | 01:36.39 | 01:37.33 |
| 16 | 01:43.33 | 01:43.67 |
| 20 | 02:10.56 | 02:11.27 |
| 22 | 02:29.39 | 02:30.10 |
| 24 | 02:40.47 | 02:41.41 |
| 27 | 02:55.64 | 02:56.38 |
| 33 | 03:19.22 | 03:19.54 |
| 36 | 05:34.53 | 05:34.77 |

*Reapplying:* don't run `extract-lyrics` on this song. With no tab lyrics it
only re-fetches lrclib and overwrites `lyrics.lrc` (and regenerates
`meta.json`'s placeholders). The unpatched LRC is kept in the gitignored
`catalog-originals/kinda-bad/silversun-pickups-lazy-eye/`. From the repo root:

```sh
python3 -I - catalog-originals/kinda-bad/silversun-pickups-lazy-eye/lyrics.lrc \
  catalog/kinda-bad/silversun-pickups-lazy-eye/lyrics.lrc <<'EOF'
import re, sys
new = {2: "00:37.11", 4: "00:43.89", 7: "00:55.88", 10: "01:18.41", 12: "01:28.78",
       13: "01:33.54", 14: "01:37.33", 16: "01:43.67", 20: "02:11.27", 22: "02:30.10",
       24: "02:41.41", 27: "02:56.38", 33: "03:19.54", 36: "05:34.77"}
old = {2: "00:36.43", 4: "00:43.54", 7: "00:55.49", 10: "01:22.20", 12: "01:28.56",
       13: "01:33.14", 14: "01:36.39", 16: "01:43.33", 20: "02:10.56", 22: "02:29.39",
       24: "02:40.47", 27: "02:55.64", 33: "03:19.22", 36: "05:34.53"}
lines = open(sys.argv[1], encoding="utf-8").read().split("\n")
for n, t in new.items():
    assert lines[n - 1].startswith(f"[{old[n]}]"), f"line {n} is not the lrclib original"
    lines[n - 1] = f"[{t}]" + lines[n - 1][len(old[n]) + 2:]
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(lines))
EOF
```

*Verification after reapplying:* 37 file lines, the text after each `]`
identical to the original, the timestamps nondecreasing, and exactly the 14
lines above changed.

## arctic-monkeys-do-i-wanna-know — `Arctic Monkeys-Do I Wanna Know_-11-18-2026.gp` (Kinda Bad II catalogue)

**Patch 1 — drop the last empty skip from the raw lyric line (applied 2026-11-27).**

*Why:* the last syllable of the song was never shown: 405 syllables, but the
dispatch ran out of notes after 404. The cause is the raw line's last double
space (an empty skip chunk), inside the song's final repeat of a three-word
phrase that the line contains three times. The skip burns one note in bar 81,
so every later syllable lands one note late. A word is stranded after the
5.25-beat rest at bar 83, a hyphenated word is split across the rest at bars
86–87, and the last syllable has no note left. **No note or rhythm XML is
touched**, so synth playback is unchanged.

*The edit* (inside the `.gp` zip, file `Content/score.gpif`, Track 0's first
`<Lyrics dispatched="true"><Line><Text>` CDATA — the raw lyric line): delete
one space from the line's **last** double space, turning it into a single
space. The line has 9 double spaces before the patch and 8 after; the last
one is at 0-based offsets 1655–1656 of the 1778-character line (which ends in
a newline, kept), and one of its two spaces is deleted. Nothing else in `score.gpif` changes (one byte shorter). The
exact text is not reproduced here (copyrighted lyrics); the canonical copy is
the patched file's CDATA, mirrored into `meta.json`'s `lyricsRawLine`.

*Reapplying,* from the repo root. The unpatched file is in the gitignored
`catalog-originals/kinda-bad-ii/arctic-monkeys-do-i-wanna-know/`:

```sh
o="catalog-originals/kinda-bad-ii/arctic-monkeys-do-i-wanna-know/Arctic Monkeys-Do I Wanna Know_-11-18-2026.gp"
w="$(mktemp -d)"   # outside the song folder
python3 -I - "$o" "$w" <<'EOF'
import re, sys, zipfile
gp, w = sys.argv[1:3]
g = zipfile.ZipFile(gp).read("Content/score.gpif").decode("utf-8")
t0 = g.index("<Track ", g.index("<Tracks>"))
m = re.compile(r"<Line>\s*<Text>\s*<!\[CDATA\[(.*?)\]\]>", re.S).search(g, g.index("<Lyrics", t0))
old = m.group(1)
assert old.count("  ") == 9 and len(old) == 1778, "not the unpatched line"
i = old.rindex("  ")
open(f"{w}/old.txt", "w", encoding="utf-8").write(old)
open(f"{w}/new.txt", "w", encoding="utf-8").write(old[:i] + old[i + 1:])
EOF
python3 -I tools/catalog-patches/gp-replace-raw-line.py "$o" 0 "$w/old.txt" "$w/new.txt" \
  "$w/Arctic Monkeys-Do I Wanna Know_-11-18-2026.gp"
# publishSong copies the .gp into the song folder, so run from the copy:
pnpm --filter @sync-tab-scroll/pipeline extract-lyrics \
  "$w/Arctic Monkeys-Do I Wanna Know_-11-18-2026.gp" "$PWD/catalog/kinda-bad-ii"
```

The raw line has more than one line, so `extract-lyrics` takes the line
breaks from it and does not query lrclib; `lyricLineBreaks` comes out
unchanged (50 lines, sum 405). It keeps the part names and display title.
If `meta.json` was rebuilt from scratch, restore them:

1. Reapply part names (see "Part names" above), key
   `kinda-bad-ii/arctic-monkeys-do-i-wanna-know`.
2. Restore the display title:
   ```sh
   f=catalog/kinda-bad-ii/arctic-monkeys-do-i-wanna-know/meta.json
   jq '.name = "Do I Wanna Know?"' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
   ```

After that, `meta.json` differs from the unpatched one only in
`lyricsRawLine` (one character). `lyrics.lrc` differs in 6 of its 100 entries
(the end-gap of line 47, the starts of lines 48–50 and the end-gaps of lines
48–49, all earlier) and in one character of line 47's text (the same double
space).

*Verification after reapplying* (2026-11-27, with the timing report's
`tabcheck.ts` and `syldump.ts`):
- 405 syllables expected and 405 dispatched (404 before).
- The last syllable is in bar 89 on the final vocal note (tick 337920), with no
  singable note after it, so nothing spills.
- Syllables 1–376 are unchanged. From bar 81 on, each phrase in bars 83, 85
  and 87 starts on its first word right after its rest, and the split across
  bars 86–87 is gone.
- Still open, by ear: the choruses are out of phase with each other (chorus 1
  about one syllable late, with a split across the rest at bar 29; chorus 2
  about one syllable early), and a hyphenated word is split at bar 70. Bar 51
  has a phrase-start note with no syllable, from the author's deliberate
  skips.

## green-day-brain-stew — `meta.json` `lyricLineBreaks` and `lyrics.lrc` (Kinda Bad II catalogue)

**Patch 1 — line breaks moved onto word boundaries (applied 2026-11-27).**

*Why:* the raw lyric line is a single line, so `extract-lyrics` maps lrclib's
line boundaries onto the dispatched syllables by nearest tick
(`alignLinesByTimestamp`). That put 11 of the 20 lines' first word (one
syllable, or three for lines 11 and 16) at the end of the line before. The
line was shown before its first word was sung, and the previous line
highlighted a word too long. The new breaks start every line on its own first
word. Lines 6, 11 and 16 now start after their 16.5-beat rest. 8 of the 20
counts change; the line count (20) and the sum (152) stay the same. **The
`.gp` is untouched.**

*The edit:* `meta.json` `lyricLineBreaks` becomes
`[8,8,8,8,6,8,8,8,8,6,8,8,8,8,6,8,8,8,8,6]`
(was `[8,8,8,9,6,8,8,8,8,8,6,8,7,8,9,5,9,7,8,6]`). `buildLrc` takes each line's
start and end times from these breaks, so `lyrics.lrc` is rebuilt with them:
the start of lines 5–13, 16 and 18 and the end-gap of lines 4–12, 15 and 17
move earlier. The text stays the same.

*Reapplying:* `extract-lyrics` keeps these breaks while they still fit (same
number of lrclib lines, summing to the dispatched syllable count). If lrclib's
lines change, it regenerates them and logs a warning. To set them by hand,
from the repo root:

```sh
d=catalog/kinda-bad-ii/green-day-brain-stew
jq '.lyricLineBreaks = [8,8,8,8,6,8,8,8,8,6,8,8,8,8,6,8,8,8,8,6]' "$d/meta.json" > "$d/meta.json.tmp" \
  && mv "$d/meta.json.tmp" "$d/meta.json"
(cd packages/pipeline && npx tsx ../../tools/catalog-patches/rebuild-lrc.ts "$PWD/../../$d" - "$PWD/../../$d/lyrics.lrc.new") \
  && mv "$d/lyrics.lrc.new" "$d/lyrics.lrc"
```

`rebuild-lrc.ts` makes the same calls as `extract-lyrics` (`loadScore`,
`findLyricsSource`, `readRawLyricsLineAuto`, `extractSyllablesFromRawLine`,
`buildTickToMs`, `buildLrc`). It takes the line texts from the current
`lyrics.lrc` and doesn't query lrclib. It refuses to run if a line had 0
syllables (`buildLrc` drops those, so their text can't be recovered) or if the
breaks don't sum to the dispatched syllable count. Run with the old breaks, it
reproduces the old `lyrics.lrc` byte for byte. If `meta.json` was rebuilt from
scratch, reapply part names too (key `kinda-bad-ii/green-day-brain-stew`).

*Verification after reapplying* (2026-11-27):
- 20 lines and 40 LRC entries (start plus end-gap per line), as before, with
  the same text and nondecreasing times.
- All 20 lines start on their own first word; before, 11 started one word
  late (lines 5–13, 16, 18).
- Rebuilding from the patched `meta.json` reproduces the patched `lyrics.lrc`
  byte for byte.
- One end-gap is written as `[00:60.00]`. `formatTimestamp` rounds 59.996 s up
  without carrying into the minutes. The client parses it as 60 s, so it's
  harmless.

## my-chemical-romance-teenagers — `My Chemical Romance-Teenagers-06-02-2026.gp` (Kinda Bad catalogue)

**Patch 1 — line-final words moved back onto the notes where they're sung (applied 2026-11-27).**

*Why:* with the new recording sync points, most words were within about
0.1 s of the singing, but some line-final words were shown 0.6–1.7 s late.
Listening with the recording, the phrase stalled after "citizen". The tab
notates these phrase endings one or two notes longer than they're sung. Most
cases look like this: the last note before a rest (often tied over the bar
line) is sung as two words, and the vocal track then has a note after the
rest that isn't sung at all. The dispatch gave one word to each note, so the
last word of the phrase slid onto the note after the rest, 2–3 beats late
("you" in bar 5, "do" in bar 9, "clean" in bar 13, "much," in bar 29, "me" at
the end of each chorus phrase, "bleed"). The next word was always correct,
so this was never a cumulative shift. In bars 8, 33–34, 41 and 49–50 the
extra note is in the middle of the phrase, so there the join comes earlier
in the line and the hold still takes the unsung note. The fix rebalances the raw lyric line
only. **No note or rhythm XML is touched**, so synth playback is unchanged.

*The edit* (inside the `.gp` zip, file `Content/score.gpif`, Track 5 ("Gerard Way |
Vocals"), first `<Lyrics dispatched="true"><Line><Text>` CDATA, the raw lyric
line, 40 lines). There are two kinds of change, and they always come in
pairs:

- **Join:** the space between two tokens becomes `+`, so both words share
  one note (one chunk).
- **Hold:** a standalone ` +` token consumes the unsung note after the rest,
  so every later chunk stays on its note.

21 joins and 21 holds give the same chunk count as before (379). Positions
below are 1-based raw-line line numbers. Tokens are split on single spaces
and counted from the end of the line (−1 is the last token):

| Lines | Join | Holds |
|---|---|---|
| 3, 9, 13, 37 | tokens −2, −1 | 1 appended |
| 14, 24, 29, 34, 38 | tokens −2, −1 (the "bleed" token joins the token before it) | 1 appended |
| 6 | tokens −4, −3 | 1 appended |
| 19 | tokens −4, −3 and tokens −2, −1 | 2 appended |
| 23, 28 | tokens −3, −2, −1 | 2 appended, plus 1 inserted as the new 3rd token (right after "said,") |
| 33 | tokens −3, −2, −1 | 2 appended |
| 26 | tokens −3, −2 | 1 appended |
| 22 | tokens −3, −2 | none (the line-23 hold balances it) |
| 27 | tokens −2, −1 (both of the line's tokens) | none (the line-28 inserted hold balances it) |

The line grows from 1669 to 1711 characters, with no trailing newline either
way. The exact text isn't reproduced here (copyrighted lyrics). The canonical
copy is the patched file's CDATA, which the pipeline mirrors into
`meta.json`'s `lyricsRawLine`.

*Reapplying,* from the repo root. The unpatched `.gp`, `meta.json`,
`lyrics.lrc` and `consent.json` are kept in the gitignored
`catalog-originals/kinda-bad/my-chemical-romance-teenagers/`:

```sh
o="catalog-originals/kinda-bad/my-chemical-romance-teenagers/My Chemical Romance-Teenagers-06-02-2026.gp"
w="$(mktemp -d)"   # outside the song folder
python3 -I - "$o" "$w/old.txt" <<'EOF'
import re, sys, zipfile
g = zipfile.ZipFile(sys.argv[1]).read("Content/score.gpif").decode("utf-8")
pos = g.index("<Tracks>")
for _ in range(6):
    t = g.index("<Track ", pos); pos = t + 1
m = re.compile(r"<Line>\s*<Text>\s*<!\[CDATA\[(.*?)\]\]>", re.S).search(g, g.index('<Lyrics dispatched="true">', t))
open(sys.argv[2], "w", encoding="utf-8").write(m.group(1))
EOF
python3 -I - "$w/old.txt" "$w/new.txt" <<'EOF'
import hashlib, sys
old = open(sys.argv[1], encoding="utf-8").read()
assert len(old) == 1669 and hashlib.sha256(old.encode()).hexdigest() == \
    "9e1d2f287c4a5e1bc556b6f3786de1c28363fb3871cbe03f3b6e99839c1fcc0d", "not the unpatched line"
lines = old.split("\n"); assert len(lines) == 40
def edit(n, joins=(), append=0, hold_after=None):
    t = lines[n - 1].split(" ")   # single-space split; line 37's 3 leading spaces stay as empty tokens
    if hold_after is not None: t.insert(hold_after, "+")
    for a, b in sorted(joins):    # join tokens a..b (counted from the end) with "+"
        t[len(t) + a: len(t) + b + 1] = ["+".join(t[len(t) + a: len(t) + b + 1])]
    lines[n - 1] = " ".join(t + ["+"] * append)
for n in (3, 9, 13, 37, 14, 24, 29, 34, 38): edit(n, [(-2, -1)], 1)
edit(6, [(-4, -3)], 1)
edit(19, [(-4, -3), (-2, -1)], 2)
for n in (23, 28): edit(n, [(-3, -1)], 2, hold_after=2)
edit(33, [(-3, -1)], 2)
edit(26, [(-3, -2)], 1)
edit(22, [(-3, -2)])
edit(27, [(-2, -1)])
new = "\n".join(lines)
assert len(new) == 1711 and hashlib.sha256(new.encode()).hexdigest() == \
    "0c6f03884c4eef2e52e1a77d47d1b8e3cb22bfb6f4b4a011c1967dad3af17f6a", "unexpected result"
open(sys.argv[2], "w", encoding="utf-8").write(new)
EOF
python3 -I tools/catalog-patches/gp-replace-raw-line.py "$o" 5 "$w/old.txt" "$w/new.txt" \
  "$w/My Chemical Romance-Teenagers-06-02-2026.gp"
# publishSong copies the .gp into the song folder, so run from the copy:
pnpm --filter @sync-tab-scroll/pipeline extract-lyrics \
  "$w/My Chemical Romance-Teenagers-06-02-2026.gp" "$PWD/catalog/kinda-bad"
```

The patched `.gp` comes out byte for byte the same every time (sha256
`c081bf0ac84a9b591f7c10fa4e7acd669c17296d14439f114c8044448014e7c2`). The raw
line has more than one line, so `extract-lyrics` takes the line breaks from it
and doesn't query lrclib. It keeps the part names and sync points. The
syllable total changes, so the old breaks no longer fit and are regenerated
(with a warning). If `meta.json` was rebuilt from scratch, reapply:

1. Part names (see "Part names" above), key
   `kinda-bad/my-chemical-romance-teenagers`.
2. Sync points (see "Recording sync points" above), same key.

After that, `meta.json` differs from the unpatched one only in
`lyricsRawLine` and `lyricLineBreaks`. The breaks become
`[7,7,8,7,7,8,7,7,8,7,7,10,13,10,12,10,7,7,7,7,7,9,12,10,12,9,1,12,10,12,10,5,9,10,12,10,10,10,12,10]`
(sum 376 → 355; each joined chunk counts as one syllable, and holds don't
count). `lyrics.lrc` keeps its 80 entries:

- 19 timestamps change, all earlier. They're the end-gaps of the lines whose
  last word moved, plus the starts of lines 23 and 28, which move one beat
  earlier.
- The text of the 17 edited lines now contains the `+` marks, as Sweetness's
  does. The full-lyrics view shows LRC text verbatim, so the `+` marks are
  visible there, the same way the hyphens already were.

`consent.json` and `recording.mp3` are untouched.

*Verification after reapplying* (2026-11-27, with the timing report's
`app-times.ts`, `tabcheck.ts` and the forced alignment
`my-chemical-romance-teenagers-g.json`):
- 379 chunks before and after (355 syllables, 21 holds, 3 empty skips).
  354 syllables are dispatched. The song's last word was already dropped
  before the patch (375 of 376) and still is, so `lyricLineBreaks` still sums
  one over the dispatched count.
- All 40 lines start on their own first word, in the same bars as before.
- Every changed syllable is within the edited phrase. All other syllables keep
  their tick.
- Confident words (alignment score ≥ 0.3) more than half a beat (268 ms) off
  drop from 25 to 12. Sung minus shown:

  | Bar | Word | Before | After |
  |---|---|---|---|
  | 4–5 | "you" | −1556 ms | +78 |
  | 8–9 | "do" | −1418 | +219 |
  | 8 | "things" / "you" | −317 / −281 | +229 / +264 |
  | 12–13 | "clean" | −1333 | +296 |
  | 28–29 | "in" / "much," | −412 / −1652 | +121 / −52 |
  | 33–34 | "they" / "They" / "said," | −378 / −384 / −417 | +155 / +150 / +116 |
  | 37–38 | "bleed" | −614 | −348 |
  | 41 | "not" / "me" | −327 / −829 | +203 / +233 |
  | 49–50 | "They" / "said," | −460 / −510 | +71 / +20 |
  | 51–52 | "me" | −979 | +614 |
  | 59–60 | "me" | −950 | +634 |
  | 67–68 | "me" | −990 | +353 |
  | 6, 7 | "gun", "son" | −395, −356 | unchanged |
  | 28 | "fit" | −359 | unchanged |
  | 50 | "scare" | −301 | unchanged |
  | 26, 36, 37 | "in", "as", "as" | +286, +295, +284 | unchanged |

  Every word whose offset changed was already more than 268 ms off. The
  one that got further off is bar 36's "of" (+673, was −660), and it has
  alignment score 0.0.

- Still open, and not fixable from the raw line:
  - **Phrase-final "me" in the choruses** is now shown early instead of late
    (+0.35 to +0.63 s). The singer puts "of me" in the middle of the
    notated rest, and no note starts there. A `.gp` rhythm change would fix
    it: split the beat-2.5 quarter in bars 19 and 67, or add a note in the
    beat-3.5 rest in bars 35, 51 and 59.
  - **"clean" (bar 13)** is sung on the tie destination at bar 13, beat 1.
    Untying it would place it exactly.
  - **"bleed"** is still 0.35–0.48 s late in bars 38, 54 and 62.
  - **Line-final words on beat 3.5 in the verses** ("gun", "son") are sung
    around beat 3. That's tab rhythm, a different cause.
  - **"fit" (bar 28)** is sung on a shift-slide note, which the dispatch
    skips.
  - **The unsung notes now carrying a hold** are in bars 20, 21, 36, 52, 60,
    68 and 69. `tabcheck` lists them as phrase-start holds.

## Recording sync points — Low `meta.json` (applied 2026-11-27)

*Why:* Low (`kinda-bad-ii/cracker-low`) had no recording. The user supplied
the studio album track (Kerosene Hat, 4:36), now `recording.mp3`. The tab has
no vocal track (its lyrics are line-timed from lrclib, `lyricsTrackIndex:
null`), so the lyric force-alignment used for the other songs couldn't be
used. The points come from the instruments instead.

*How:* the recording was split into four Demucs stems (htdemucs). The tab's
own note onsets, per track (kick, snare and hats separately; bass; guitars),
were cross-correlated with the matching stem's onset envelope in 8-bar
windows every 2 bars. A beat grid matches at every beat shift. The tab's
fills, stops and section changes don't, so each window has one clear peak.
The tab has no repeats or jumps, and its tempo map is 88 bpm throughout,
after a 1/4 pickup bar.

The recording doesn't hold a steady tempo. A straight-line fit leaves errors
up to 0.44 s (rms 0.25 s). The band plays about 86.4 bpm through bar 44, then
speeds up gradually to 87.5–88 bpm from bar 49 to the end. So there is one
anchor every 4 bars, from the measured window positions. Anchors every 8
bars left windows up to 55 ms off, which is above the client's 35 ms drift
threshold. Other points:
- Bar 1 is at 393 ms, the drum pickup, which is the tab's first note.
- Bar 2 at 1083 ms matches where the guitars and bass enter (1082–1105 ms).
- The tab ends on a held chord at bar 97 beat 1. The end of bar 99 is
  extrapolated at the rate of the bars before it.

*Checks:*
- Kick, snare and bass are checked separately, against two different stems.
  Each lands within 60 ms of the map in all 48 windows (medians −15, −5 and
  +10 ms).
- The last kick hit (262.92 s) is within 40 ms of the bar-97 point.
- The guitars don't confirm or contradict the map. Their strumming repeats
  too regularly to give one clear peak.
- The lrclib LRC was checked against the vocal stem's phrase starts. Most
  lines lead the singing by about 0.1–0.6 s, which is normal for lrclib. Two
  stretches are off:
  - Pre-chorus 3, lines [03:18.73], [03:24.36], [03:29.86] and [03:35.11], is
    1.2–1.4 s early. Those phrases start at 3:20.08, 3:25.52, 3:31.04 and
    3:36.47.
  - [03:38.39] is about 3.5 s early. That phrase starts at 3:41.92.
  `lyrics.lrc` was not changed.

*The edit:* `docs/catalog-sync-points.json` key `kinda-bad-ii/cracker-low`
(26 points), reapplied as above.

*Lyrics (`lyrics.lrc`, 2026-11-27):* five lrclib line starts were re-timed to
the measured vocal phrase starts minus 0.2 s (lrclib's usual small lead), and
the text is unchanged. These are file lines 29–33, the four pre-chorus-3 lines
(1.2–1.4 s early) and the line that was `[03:38.39]` (3.5 s early):
`[03:18.73]→[03:19.88]`, `[03:24.36]→[03:25.32]`, `[03:29.86]→[03:30.84]`,
`[03:35.11]→[03:36.27]`, `[03:38.39]→[03:41.72]`. The original file is in the
gitignored `catalog-originals/kinda-bad-ii/cracker-low/`. Re-fetching from
lrclib would undo this, so reapply with `sed` on those five timestamps.

## Recording sync points — Do I Wanna Know, Brain Stew, Sweetness, Dirty Little Secret, 1979 `meta.json` (applied 2026-11-27)

*Why:* these five Kinda Bad II songs had no recording. The studio album
tracks (bought 2026-11-27) are now each song's `recording.mp3` (in the
gitignored `catalog/`, like the other recordings), and each `meta.json`
gained a `syncPoints` array. Nothing else in the metas changed.

*How the points were measured:*
- **Instruments first.** The tab's own note onsets, in alphaTab playback
  order (repeats unrolled), were cross-correlated with Demucs drum, bass and
  guitar stems in 4-bar windows. Lines or 8-bar anchors were then fitted to
  those windows. These patterns are not periodic, so each window has one
  clear peak.
- **Lyrics as a cross-check.** wav2vec2 forced alignment of the tab's
  syllables against the vocal stem, using consonant-initial words only. The
  aligner places vowel-initial words 140–170 ms late.
- **Final check.** Each tab drum hit, mapped through the points, was checked
  for a recording drum onset within 35 ms.
- **The points were replayed through alphaTab.**
  `Score.applyFlatSyncPoints` followed by
  `MidiFileGenerator.generateSyncPoints` reproduces the intended map to
  within 0.01 ms at every played bar.
- **The lyric fit alone was not enough.** On Do I Wanna Know, the tab's
  lyric placement errors would have bent an 8-bar lyric fit by up to 0.4 s.
  On 1979 the lyrics are unusable from bar 45 on.
- **Tooling bug fixed.** The older onset scripts took a 220-sample hop at
  44.1 kHz to be exactly 5 ms. It is 4.989 ms, which stretches the
  instrumental timeline by 0.23%. The copies used here correct for it.

*The points* (bar numbers are written bars; all `barOccurence` 0):

- **Do I Wanna Know?:** steady 85.003 bpm against the notated 85. Two points:
  bar 1 at 167.4 ms (the drum onset is at about 160 ms) and the end of bar 93
  at 262746.7 ms. Drum-window residuals have an RMS of 7 ms, and in every
  8-bar window 91–100% of drum hits land within 35 ms.
  - The lyric windows swing between −0.4 and +0.3 s. This is the known
    chorus phase error (chorus 1 runs a syllable late, chorus 2 one early),
    not the take.
- **Brain Stew:** the take is not steady.
  - It sits at about 75.1–75.6 bpm through bar 24 and about 76.3–76.7 bpm
    through bar 48. The outro (bars 49–63) speeds up to about 81.7 bpm.
  - There are eight points: bar 1 at 100.0 ms (the first guitar onset), then
    the starts of bars 9, 17, 25, 33, 41 and 49 (25556.3, 50943.4, 76500.1,
    101517.6, 126695.7 and 151869.0 ms), and the end of bar 63 at 195928.3 ms.
    The tab's last drum hit (bar 61, beat 1.25) lands on the recording's
    final drum hit at 187.3 s. The end point lies past the end of the mp3
    (193.0 s).
  - Through bar 48 (all the lyrics), drum windows fit within ±22 ms and sung
    words within −54 to −9 ms per 8 bars.
  - The outro is less certain. Its drum pattern matches the recording
    poorly, so it may be off by up to about 0.2 s there.
- **Sweetness:** steady at about 135.16 bpm throughout, including bars 1–17,
  which the tab notates at 130. There are three points, the middle one at the
  130 → 135 change, which alphaTab needs because it interpolates in notated
  time:
  - bar 1 at 306.4 ms;
  - bar 18 at 29385.0 ms;
  - the end of bar 120 at 212264.0 ms.

  Bar 1 is the a cappella pickup (3/8). Its time is extrapolated from the
  instrumental fit, since the band enters at bar 4. It matches the vocal
  stem's first sound at about 310 ms. Instrument-window residuals have an
  RMS of 1.6 ms.
- **Dirty Little Secret:** steady 143.81 bpm against the notated 144. Two
  points: bar 1 at 1246.1 ms (the guitar onset is at about 1220 ms) and the
  end of bar 109, the last played bar, at 188153.9 ms. The tab repeats bars
  90–93 (endings at 93 and 94), so 112 bars are played.
  - The points are in playback order. Neither falls in a repeated bar, so
    both have `barOccurence` 0.
  - Every 12-bar window, including those after the repeat, has 93–100% of
    its drum hits within 35 ms. Consonant-word windows sit within ±24 ms
    through bar 92.
- **1979:** steady 127.03 bpm against the notated 127. The 7/8 and 9/8 bars
  need no points, because tempo is constant and the map is linear in ticks.
  Two points: bar 1 at 463.4 ms and the end of bar 138 at 261180.3 ms.
  - Instrument-window residuals have an RMS of 3 ms, and 90–100% of drum hits
    land within 35 ms per 8 bars.
  - The intro is quiet, so no onset threshold gives bar 1 reliably. The fit
    is confirmed by the intro's faint drum hits, which land within 10 ms.
  - The lyrics agree only up to bar 48 (sung about 35 ms early). From bar 45
    on, the tab's lyric dispatch falls behind and 15 syllables are never
    placed: the raw line has 271 syllables and only 256 notes take them. The
    vocal alignment there is unusable and was not used.

*Not fixable with sync points* (tab lyric placement; confident words more
than half a beat off after the fit):
- Do I Wanna Know?: bars 30–52 run 0.35–0.9 s late (the words are sung
  earlier than shown), and bars 63–64 and 75–76 run about 0.4 s early.
- Dirty Little Secret: from bar 93 on, in both passes of the repeat and in
  bars 95–101, the words are shown up to 5 s away from where they are sung.
  Isolated words at bars 17, 30, 41, 43 and 48 are 0.22–0.47 s off. Single
  words at bars 33 (−0.97 s) and 59 (−1.27 s) are probably aligner misses.
- 1979: everything from bar 45 on (see above).
- Sweetness: isolated words at bars 11, 14, 21, 45 and 97 (0.24–0.43 s off).
  Bars 73–88 couldn't be checked, because the aligner lost the echoed vocals
  there.
- Brain Stew: one word at bar 48.

*The edit:* each song's entry in `docs/catalog-sync-points.json`, keyed
`kinda-bad-ii/<song>`. Reapply them the same way as the other songs' points
(see "Recording sync points" above):

```sh
for s in arctic-monkeys-do-i-wanna-know green-day-brain-stew jimmy-eat-world-sweetness \
         the-all-american-rejects-dirty-little-secret smashing-pumpkins-1979; do
  k=kinda-bad-ii/$s
  f=catalog/$k/meta.json
  jq --slurpfile m docs/catalog-sync-points.json --arg k "$k" \
    '.syncPoints = $m[0][$k]' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
```

**Patch 2 — "out" back on its note in bars 4 and 28 (applied 2026-11-27, on top of Patch 1).**

*Why:* after Patch 1, the user heard bar 4's "out" late, and everything after it
seemed a little late. In bar 4, the note after "citizen" (beat 2.5, a quarter,
F#) has a shift slide into the next note. The dispatcher skips shift-slide
origins, so "out" landed a beat late on beat 3.5 and "of" on the tied note at
beat 4.5. The vocal stem shows a new onset near beat 2.7 and the sung pitch on
that F#, so "out" is sung on the skipped note. The raw line can't put a syllable
on a beat the dispatcher skips. No syntax does that: an empty chunk takes the
beat but shows nothing. So this patch removes the slide from that note in the
`.gp`.

The note is stored once and shared by bar 28, which has the same melody. There,
"fit" is likewise sung on the slide note (Patch 1 left it −0.36 s off).

Two more joins fix the confident words still late in bars 6–7, "gun" and "son".
Both are sung on the quarter note before them, and the tab's following eighth on
beat 3.5 has no new syllable. They now take the same join-plus-hold as Patch 1.

**This supersedes parts of Patch 1:**
- Patch 1 says no note XML is touched. That no longer holds.
- Its `.gp` sha256, `lyricLineBreaks` array and the "out", "of", "fit", "gun"
  and "son" rows of its before/after table are replaced by the values below.

*Why not a dispatch-rule change.* I tested dropping the shift-slide skip on
copies of `packages/shared` and on the whole catalog, without changing the repo:
- **Shared tests:** one unit test fails, the one that asserts the skip.
- **Creep:** 35 syllables move, starting at bar 63 → 62. That's the bridge the
  user verified by ear, and the Creep real-file tests don't cover it.
- **Other songs:** Do I Wanna Know (297 syllables), 1979 (186) and Dirty Little
  Secret (34) shift too.

A narrower rule, skipping only slide notes shorter than a quarter, still moves 16
syllables in 1979 and 34 in Dirty Little Secret, with no alignment data to check
them. It would also need a duration field on `DispatchBeat`.

*Cost of the `.gp` change:* in bars 4 and 28, the vocal track's synth playback
loses the slide glide from F# into the next note. The rendered tab loses the
slide mark there too. Nothing else changes.

*The edit* (on the Patch 1 file, inside the `.gp` zip, `Content/score.gpif`):
1. **Note 305** is used only by beats 493 (bar 4) and 644 (bar 28) of track 5.
   Delete its `<Property name="Slide"><Flags>1</Flags></Property>`, leaving
   the file with 42 Slide properties instead of 43.
2. **Track 5's raw lyric line,** relative to the Patch 1 CDATA. Tokens are
   split on single spaces and counted from the end of the line:
   - Line 3: token −2, a Patch 1 join, is split back at its `+`.
   - Line 19: token −4, the first Patch 1 join on that line, is split back at
     its `+`.
   - Lines 4 and 5: tokens −2 and −1 are joined with `+`, and ` +` is
     appended.

The chunk count goes from 379 to 381, because the two slide notes now take
chunks. The line grows from 1711 to 1715 characters, with no trailing newline.

*Reapplying,* from the repo root, on a song folder that has Patch 1 applied (or
after reapplying Patch 1 above):

```sh
d=catalog/kinda-bad/my-chemical-romance-teenagers
g="My Chemical Romance-Teenagers-06-02-2026.gp"
w="$(mktemp -d)"   # outside the song folder
python3 -I - "$d/$g" "$w" <<'EOF'
import hashlib, re, sys, zipfile
gp, w = sys.argv[1:3]
assert hashlib.sha256(open(gp, "rb").read()).hexdigest() == \
    "c081bf0ac84a9b591f7c10fa4e7acd669c17296d14439f114c8044448014e7c2", "not the Patch 1 file"
z = zipfile.ZipFile(gp); g = z.read("Content/score.gpif").decode("utf-8")
# 1. drop the shift slide from note 305
m = re.search(r'<Note id="305">.*?</Note>', g, re.S); blk = m.group(0)
users = re.findall(r'<Beat id="(\d+)">(?:(?!</Beat>).)*?<Notes>([^<]*)</Notes>', g, re.S)
assert sorted(b for b, ns in users if "305" in ns.split()) == ["493", "644"], "note 305 is used elsewhere"
p = re.search(r'\n\s*<Property name="Slide">\s*<Flags>1</Flags>\s*</Property>', blk)
assert p and "<Number>54</Number>" in blk
g2 = g[: m.start()] + blk[: p.start()] + blk[p.end():] + g[m.end():]
assert g2.count('name="Slide"') == g.count('name="Slide"') - 1
with zipfile.ZipFile(f"{w}/slid.gp", "w") as out:
    for info in z.infolist():
        if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename: continue
        out.writestr(info, g2.encode("utf-8") if info.filename == "Content/score.gpif" else z.read(info),
                     compress_type=info.compress_type)
# 2. raw-line edits
pos = g.index("<Tracks>")
for _ in range(6):
    t = g.index("<Track ", pos); pos = t + 1
old = re.compile(r"<Line>\s*<Text>\s*<!\[CDATA\[(.*?)\]\]>", re.S).search(g, g.index('<Lyrics dispatched="true">', t)).group(1)
assert hashlib.sha256(old.encode()).hexdigest() == \
    "0c6f03884c4eef2e52e1a77d47d1b8e3cb22bfb6f4b4a011c1967dad3af17f6a", "not the Patch 1 raw line"
lines = old.split("\n"); assert len(lines) == 40
def split_back(n, k):                      # token k (from the end) "a+b" -> "a b"
    tk = lines[n - 1].split(" "); assert tk[k].count("+") == 1
    tk[k] = tk[k].replace("+", " "); lines[n - 1] = " ".join(tk)
def join_last2(n):
    tk = lines[n - 1].split(" "); lines[n - 1] = " ".join(tk[:-2] + ["+".join(tk[-2:]), "+"])
split_back(3, -2); split_back(19, -4); join_last2(4); join_last2(5)
new = "\n".join(lines)
assert len(new) == 1715 and hashlib.sha256(new.encode()).hexdigest() == \
    "765f4c2666ba149d46472b57b50a2c4ea8e66b1d6ff3f03d32fffce1ba778309", "unexpected result"
open(f"{w}/old.txt", "w", encoding="utf-8").write(old)
open(f"{w}/new.txt", "w", encoding="utf-8").write(new)
EOF
python3 -I tools/catalog-patches/gp-replace-raw-line.py "$w/slid.gp" 5 "$w/old.txt" "$w/new.txt" "$w/$g"
pnpm --filter @sync-tab-scroll/pipeline extract-lyrics "$w/$g" "$PWD/catalog/kinda-bad"
```

The result is byte for byte the same every time: `.gp` sha256
`1311b69196612772fcaf1136555c8597c95d9a60c537e4b2f1804e7387c041ea`. This patch
keeps the line count and the syllable total (355), so `extract-lyrics` would
keep the Patch 1 breaks: delete them first, before the `extract-lyrics` step
(`f=catalog/kinda-bad/my-chemical-romance-teenagers/meta.json; jq
'del(.lyricLineBreaks)' "$f" > "$f.tmp" && mv "$f.tmp" "$f"`). `extract-lyrics`
keeps the part names and sync points. If `meta.json` was rebuilt from scratch,
reapply them as for Patch 1 (key `kinda-bad/my-chemical-romance-teenagers`).
The sync points don't change in this patch.

After that, `meta.json` differs from the Patch 1 one only in `lyricsRawLine`
and `lyricLineBreaks`. The breaks become
`[7,7,9,6,6,8,7,7,8,7,7,10,13,10,12,10,7,7,8,7,7,9,12,10,12,9,1,12,10,12,10,5,9,10,12,10,10,10,12,10]`
(sum still 355). In `lyrics.lrc`:
- The text of lyric lines 3, 4, 5 and 19 changes (file lines 5, 7, 9 and 37).
- Two end-gaps move earlier: file line 8 by 0.53 s and file line 10 by 0.54 s.
  Those are the ends of lyric lines 4 and 5.

`consent.json` and `recording.mp3` are untouched.

*Verification after reapplying* (2026-11-27):
- 381 chunks (355 syllables, 23 holds, 3 empty skips). 354 are dispatched: the
  song's last word is still dropped, as before both patches.
- All 40 lines start on their own first word, in the same bars as before.
- Bar 4 dispatches one syllable to each of its six notes (beats 1, 1.5, 2, 2.5,
  3.5, 4.5). Bar 28 has its "fit" on beat 2.5.
- Changed words, sung minus shown, against the forced alignment, with the
  vocal-stem onset where the two disagree:

  | Bar | Word | Patch 1 | Patch 2 |
  |---|---|---|---|
  | 4 | "out" | −122 ms (aligner), about −445 by onset | +417 (aligner), about +90 by onset |
  | 4 | "of" | −202 (aligner), about −430 by onset | +338 (aligner), about +105 by onset |
  | 6 | "gun" | −395 | +151 |
  | 7 | "son" | −356 | +189 |
  | 28 | "fit" | −359 | +175 |

  For bar 4, the aligner puts "out" and "of" (both vowel-initial) between the
  two notes. The onsets and pitch put them right after beats 2.5 and 3.5, and
  so does the user's ear. Confident words (score ≥ 0.3) more than 268 ms off
  by the aligner go from 12 to 11. That count includes "out" and "of", which
  the aligner marks as worse.
- The recording's sync is unchanged. Kick-drum onsets fit the map within
  0 ± 15 ms in bars 10–16. Lead guitar is within ±45 ms in bars 2–4 and 7–9.
  Three candidate maps with an extra anchor near bar 5, 7 or 9 each made the
  vocal fit worse.

## Recording sync points — onset-tool time-stretch fix, Low and Lazy Eye `meta.json` (2026-11-27)

*Why:* the onset-envelope scripts used to measure these two songs
(`stem_align.py` for Low, `gridfit.py` for Lazy Eye) took their integer STFT
hop as a nominal frame length. At 44.1 kHz, 220 samples is 4.98866 ms rather
than 5 ms, and 44 samples is 0.99773 ms rather than 1 ms. Every
instrument-derived time was therefore stretched by ×1.00227 (44.1/44). The
error grows through the song: by the end, the cursor is about 0.6 s (Low)
and 0.8 s (Lazy Eye) late. The scripts now use
`frame_ms = 1000*hop/sr`, and the points were measured again.

*Low* (`kinda-bad-ii/cracker-low`, 26 points, an anchor every 4 bars):
- **How:** 8-bar windows every 2 bars, measured again with the fixed
  `stem_align.py` and fitted with `fit_sync.py --direct --every 4
  --end-prev-rate`.
- **Bar 1:** 390.0 ms, the drum pickup's first sound (the 393 ms used before
  was not measured with the fixed tools).
- **Result:** every new point is within 20 ms of the old point scaled by
  44/44.1, which shows the error was the stretch. The end of bar 99 moves
  from 271068.0 to 270439.8 ms.
- **Checks:** window residuals have an RMS of 1.6 ms. In every 12-bar window,
  83–100% of tab drum hits land within 35 ms of a recording drum onset; with
  the old points it was 2–84%.

*Lazy Eye* (`kinda-bad/silversun-pickups-lazy-eye`, 2 points):
- **Points:** bar 1 at 78.0 ms and the end of bar 187 at 352344.2 ms
  (127.404 bpm, 1883.78 ms per bar). The old points were 78.0 and 353145.2 ms
  (1888.06 ms per bar).
- **How the slope was chosen:** the fixed `gridfit.py` gives 1883.86 ms per
  bar. Its fine grid leaves the drum hits drifting to −12 ms by the end. The
  fixed `stem_align.py` line gives 1883.78 ms per bar, which keeps the drum
  hits at −3 to 0 ms throughout, so that slope was used.
- **Checks:** 77–100% of drum hits land within 35 ms in every 24-bar window,
  with the best shift at 0 everywhere. With the old points it was 12–68%, with
  best shifts of up to ±245 ms.

*Unchanged:* both songs' `lyrics.lrc`.
(Both have since been replaced by GP-derived files; see "Vocal tracks for
Low and Lazy Eye" below.)
- Lazy Eye's LRC is in recording time, taken from the wav2vec2 vocal
  alignment, whose frame time is computed from the clip length. The frame bug
  doesn't touch it.
- Low's re-timed lines come from vocal phrase starts measured in 10 ms frames.
  At 44.1 kHz that is exactly 441 samples, so it is unaffected too.

*The edit:* the two songs' entries in `docs/catalog-sync-points.json`.
Reapply them the same way as the other songs' points (see "Recording sync
points" above).

## Recording sync points — Supermassive Black Hole `meta.json` (applied 2026-11-27)

*Why:* the song had no recording. The album track (supplied 2026-11-27) is
now `catalog/muse-supermassive-black-hole/recording.mp3` (gitignored, like
the other recordings), and `meta.json` gained a `syncPoints` array. Nothing
else in the meta changed, and `lyrics.lrc` was not edited.

*The tab:* 104 bars of 4/4 at a constant 120 bpm, with no repeats or other
jumps, so written bars and played bars are the same.

*How the points were measured:*
- **Instruments.** The tab's note onsets were cross-correlated with Demucs
  drum, bass and guitar stems in 8-bar windows. All 51 windows agree on one
  straight line at exactly 120.000 bpm (rms 1.2 ms, worst 3.3 ms). The
  record does not drift from the click.
- **Bar 1.** The window fit puts bar 1 at 2755 ms. The opening kick and bass
  onset is at 2744 ms, and 2744 ms leaves the drum hit check with a median
  offset of 0 to −2 ms in every 8-bar block. 2744 ms was used.
- **Drum check.** 88–100% of the tab's drum hits fall within 35 ms of a
  recording drum onset in every 8-bar block.
- **alphaTab replay.** `Score.applyFlatSyncPoints` followed by
  `MidiFileGenerator.generateSyncPoints` reproduces the intended map to
  within 0.01 ms at every bar.

*The points* (written bars, `barOccurence` 0):

| Point | ms |
|---|---|
| Start of bar 1 | 2744.0 |
| End of bar 104 | 210744.7 |

*Lyrics (`lyrics.lrc`, lrclib, line-timed):* every line starts about
2.4 s before the singing on this recording. The first sung phrase starts at
35.2 s, which is also where the tab's first vocal note falls through these
points, but the first LRC line is stamped 32.8 s. Matched against the tab's
vocal phrase starts, every one of the 36 lines is 2.2–3.0 s early (median
2.48 s). This is one offset for the whole file, not individual lines out of
place. It is probably timed to a release with a shorter intro. Shifting
every line by about +2.45 s would fix it. The file was not changed.

## Supermassive Black Hole: lrclib lyrics shifted +2.45 s (2026-11-27)

*Why:* the lyrics are lrclib line times (`lyricsTrackIndex` null), which the
client reads as recording time and converts to tab time through `syncPoints`
in synth mode. Against the album `recording.mp3`, all 36 lines were 2.2–3.0 s
early (median 2.48 s): the vocal stem's first sound is at 35.25 s, but the
first line was stamped 32.81 s. lrclib probably timed a release with a
shorter intro. Before the song had sync points, synth used the times as tab
time and was only about 0.3 s late, so the error appeared when the recording
was installed.

*The edit:* every timestamp +2450 ms; text unchanged. The first line moves
32.81 → 35.26 s, which is tab time 32.52 s, against the tab's first vocal
note at 32.50 s.

*Reapply:* `python3 -I tools/catalog-patches/lrc-shift.py
catalog/muse-supermassive-black-hole/lyrics.lrc 2450`. Result md5
`53069a97dba235c247611b81c7380e2b`. Tracked in the catalog repo.

## kinda-bad-ii/smashing-pumpkins-1979: bars 45 to the end (2026-11-27)

**Report.** From bar 46 on, words are shown late: a full bar behind from bar 47 to about bar 90, then further behind. "below" (bar 50) appears after the bars 51–56 gap.

**Cause.** No offset, repeat or start-bar problem: the raw line's start bar (`<Offset>`) is 0, the score has no repeats or jumps, and the sync points fit. Bars 1–44 are right. After bar 44, 13 singable notes got no syllable, so every later word slid onto a later note:

- **7 shift-slide origins** (bars 46:4.5, 72:3.5, 78:4.5, 80:3.5, 83:4.5, 87:4.5, 122:4.5). The dispatcher skips these, as in Teenagers bar 4, but the singer puts a syllable on each.
- **15 `_` empty skips** after bar 44. Each one burns a beat. Six of them landed on singable notes (bars 47:4.5, 86:4.5, 89:4.5, 94:4.5, 126:4.0, 129:4.0; confirmed by replaying the old chunks against the beats); the rest landed on ties or rests.

Most phrases in this song are two eighth notes at 4.0 and 4.5. So two lost notes push a phrase back a full bar, which is what the user heard: bar 46:4.5 plus bar 47:4.5 put it one bar behind from bar 47, and the losses around bars 78–94 put it further behind. The tab also has two-syllable words on single notes in bars 85 and 89, which the old line split across two notes. In total 271 syllables competed for 256 dispatchable notes, and the last 15 were dropped.

**Fix.**

1. **.gp note properties.** Removed the shift slide (`<Property name="Slide"><Flags>1</Flags>`) from five track-0 GPIF notes. Each note is shared only by the beats listed:

   | GPIF note | Beats | Bars |
   |---|---|---|
   | 46 | 140, 249 | 46:4.5 and 78:4.5 |
   | 51 | 222, 256 | 72:3.5 and 80:3.5 |
   | 64 | 269 | 83:4.5 |
   | 68 | 281 | 87:4.5 |
   | 82 | 399 | 122:4.5 |

2. **Raw line, from bar 45 on.** Tokens 0–78 (through bar 44) are byte-identical. The changes:
   - Dropped all 15 `_` skips after bar 44.
   - Merged the two-syllable words at bars 85:1 and 89:1 into one chunk each.
   - Added one `+` hold at bar 86:4.5.
   - Joined two words onto bar 89:4.5.

   Result: 270 chunks, 268 syllables, all dispatched, none dropped. The line went from 1262 to 1230 characters.
3. **meta.json.** Changed only `lyricsRawLine` and `lyricLineBreaks`, to `[8,7,10,4,7,9,12,12,9,15,9,9,10,12,12,4,7,7,6,5,6,7,7,9,11,12,10,15,9,8]` (sum 268). The first 9 entries are unchanged. `syncPoints` and `defaultStartBar` are untouched.
4. **lyrics.lrc.** Rebuilt with `tools/catalog-patches/rebuild-lrc.ts`. Lines 1–19 are unchanged; only timestamps changed, no line text.

**Check.** tabcheck now reports:
- 268 of 268 dispatched;
- no singable notes after the last syllable;
- no phrase-start note without a syllable;
- no hold on a phrase start;
- no hyphenated word split across rests;
- 30 lines that sum to 268, with no mid-word line splits.

Bars 1–44 syllables are identical in text and tick. Bars 113–126 (the second verse ending and its repeat of the bars 45–50 phrase) now have the same syllable text and the same note positions as the approved bars 37–50, and the note structure matches bar for bar.

Confident words (aligner score ≥ 0.3) more than 268 ms off, song-wide: 100 before, 12 after.

| bar | sung − shown (ms) | score | verdict |
|---|---|---|---|
| 16 | +394 | 0.30 | untouched (bars 1–44, approved) |
| 33 | −310 | 0.50 | untouched (bars 1–44, approved) |
| 46 ("I") | +472 | 0.79 | likely aligner: vowel-initial (about +150 bias); strongest vocal onset at 46:2.88; 46:3.0 is the only singable note before 46:4.5 |
| 48 | +291 | 0.56 | borderline, one eighth |
| 72 | +457 | 0.75 | vowel-initial, about +300 net; singer's phrasing |
| 77 | +814 | 0.30 | weak score; kept in order between confident neighbors |
| 93 | −434 | 0.32 | weak score |
| 94 | +818 | 0.41 | last note before the bars 95–96 rest; nowhere later to go |
| 105 | +354 | 0.94 | vowel-initial, about +200 net |
| 118 | −770 | 0.48 | mirrors approved bar 42 (−65 there); kept |
| 122 ("I") | +488 | 0.50 | same case as bar 46 |
| 133 | −533 | 0.31 | weak score |

Hand choices that rest on weaker evidence:
- the single-chunk two-syllable words at 85:1 and 89:1;
- the join on 89:4.5;
- the hold on 86:4.5;
- the slide removals at bars 78, 80, 83 and 87. These follow from note sharing (notes 46 and 51) and from the phrase pattern, more than from confident aligner words on those notes.

**Hashes.**

| | before | after |
|---|---|---|
| .gp file | `522d3b3a499d57cf402fb68e99bd53b4d78a8109d21133de9b418dc3f2207742` | `88a0a4d3e554c7eb3ff831e19071b1f5fe370098f1f284c7bda44b8890d10575` (the zip is not byte-reproducible; check the gpif instead) |
| Content/score.gpif | — | `c18f6f7aed061aca55b4252b15b81cbc2a4576117648d4bb86395a530cf42dad` |
| raw line | `afeb131698801a543c3ee621b1c7a3022e36d77347435ee57d1ea847dbef8fb0` | `959b9b88e465e038575ede295266449f3d91a6cae91bd92048abf9c10ae96ecd` |
| meta.json | `4f185e3007dd8483fd90350cfbfe76bfc82a0fb34f55b1208d77f4a3f1c820e9` | `29d9eab543c770111db0b9340764e87315948e19eb5caf671e53742eb29b7d0a` |
| lyrics.lrc | `9adcb3b3…` | `30ba2bb16ad38d2a8bd82b54420ac81d3d4382a205c494a20d189a8ccaaec35d` |

recording.mp3 (`00d91b2c…`) and consent.json (`c3e2f35e…`) are unchanged.

**Reapply.** Save the three files below in one directory, then run `reapply.sh <repo root> <that dir>`. The script refuses to run unless the song is in its original state, and it checks every intermediate and output hash.

`slides-off.py`:

```python
"""slides-off.py <in.gp> <out.gp>: remove the shift slide (Slide Flags 1) from the 1979 lead-vocal notes 46, 51, 64, 68, 82.
Each note must be used only by the expected track-0 beats (bars 46+78, 72+80, 83, 87, 122)."""
import re, sys, zipfile
src, dst = sys.argv[1:3]
WANT = {"46": ["140", "249"], "51": ["222", "256"], "64": ["269"], "68": ["281"], "82": ["399"]}
z = zipfile.ZipFile(src); g = z.read("Content/score.gpif").decode("utf-8")
users = re.findall(r'<Beat id="(\d+)">(?:(?!</Beat>).)*?<Notes>([^<]*)</Notes>', g, re.S)
n0 = g.count('name="Slide"')
for nid, beats in WANT.items():
    assert sorted(b for b, ns in users if nid in ns.split()) == sorted(beats), f"note {nid} used elsewhere"
    m = re.search(rf'<Note id="{nid}">.*?</Note>', g, re.S); blk = m.group(0)
    p = re.search(r'\n\s*<Property name="Slide">\s*<Flags>1</Flags>\s*</Property>', blk)
    assert p and blk.count('name="Slide"') == 1, f"note {nid}: not the unpatched slide"
    g = g[: m.start()] + blk[: p.start()] + blk[p.end():] + g[m.end():]
assert g.count('name="Slide"') == n0 - len(WANT)
with zipfile.ZipFile(dst, "w") as out:
    for info in z.infolist():
        if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename: continue
        out.writestr(info, g.encode("utf-8") if info.filename == "Content/score.gpif" else z.read(info), compress_type=info.compress_type)
print(f"patched {dst}")
```

`build-raw.py`:

```python
"""build-raw.py <old-raw.txt> <new-raw.txt>: rebuild the 1979 raw line from bar 45 on.
Tokens are the old line split on single spaces; tokens 0-78 (through bar 44) stay as they are."""
import sys
t = open(sys.argv[1], encoding="utf-8").read().split(" ")
assert len(t) == 287 and t[79] == t[80] == "_" and t[172] == t[182] == "_"
assert t[171].endswith("-") and t[181].endswith("-")
out, skip = [], {173, 183, 186}
for i, x in enumerate(t):
    if i in skip or (i > 78 and x == "_"): continue   # drop all 15 empty skips after bar 44
    if i in (171, 181): x = x[:-1] + t[i + 2]          # bars 85, 89: two-syllable word on one note
    if i == 185: x = x + "+" + t[186]                  # bar 89:4.5 carries two words (join)
    out.append(x)
    if i == 176: out.append("+")                       # bar 86:4.5 hold on the sustained word
open(sys.argv[2], "w", encoding="utf-8").write(" ".join(out))

```

`reapply.sh`:

```bash
#!/usr/bin/env bash
# Reapply the 1979 bar-45-on patch. Usage: reapply.sh <repo root> <dir with slides-off.py and build-raw.py>
set -euo pipefail
R=$1; T=$2; D=$R/catalog/kinda-bad-ii/smashing-pumpkins-1979; G="Smashing Pumpkins-1979-11-15-2026.gp"
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
h() { shasum -a 256 "$1" | cut -c1-64; }
[ "$(h "$D/$G")" = 522d3b3a499d57cf402fb68e99bd53b4d78a8109d21133de9b418dc3f2207742 ] || { echo ".gp is not the original"; exit 1; }
[ "$(h "$D/meta.json")" = 4f185e3007dd8483fd90350cfbfe76bfc82a0fb34f55b1208d77f4a3f1c820e9 ] || { echo "meta.json is not the original"; exit 1; }
jq -j .lyricsRawLine "$D/meta.json" > "$W/old.txt"
[ "$(h "$W/old.txt")" = afeb131698801a543c3ee621b1c7a3022e36d77347435ee57d1ea847dbef8fb0 ] || { echo "raw line differs"; exit 1; }
python3 -I "$T/build-raw.py" "$W/old.txt" "$W/new.txt"
[ "$(h "$W/new.txt")" = 959b9b88e465e038575ede295266449f3d91a6cae91bd92048abf9c10ae96ecd ] || { echo "new raw line differs"; exit 1; }
cp "$D/$G" "$W/orig.gp"
python3 -I "$T/slides-off.py" "$W/orig.gp" "$W/slid.gp"
python3 -I "$R/tools/catalog-patches/gp-replace-raw-line.py" "$W/slid.gp" 0 "$W/old.txt" "$W/new.txt" "$W/$G"
[ "$(unzip -p "$W/$G" Content/score.gpif | shasum -a 256 | cut -c1-64)" = c18f6f7aed061aca55b4252b15b81cbc2a4576117648d4bb86395a530cf42dad ] || { echo "patched gpif differs"; exit 1; }
echo '[8,7,10,4,7,9,12,12,9,15,9,9,10,12,12,4,7,7,6,5,6,7,7,9,11,12,10,15,9,8]' > "$W/breaks.json"
jq --rawfile r "$W/new.txt" --slurpfile b "$W/breaks.json" '.lyricsRawLine=$r | .lyricLineBreaks=$b[0]' "$D/meta.json" > "$W/meta.json"
[ "$(h "$W/meta.json")" = 29d9eab543c770111db0b9340764e87315948e19eb5caf671e53742eb29b7d0a ] || { echo "meta differs"; exit 1; }
cp "$W/$G" "$D/$G"; cp "$W/meta.json" "$D/meta.json"
(cd "$R/packages/pipeline" && ./node_modules/.bin/tsx ../../tools/catalog-patches/rebuild-lrc.ts "$D" - "$W/lyrics.lrc")
[ "$(h "$W/lyrics.lrc")" = 30ba2bb16ad38d2a8bd82b54420ac81d3d4382a205c494a20d189a8ccaaec35d ] || { echo "lrc differs"; exit 1; }
cp "$W/lyrics.lrc" "$D/lyrics.lrc"; echo "1979 patch applied"
```

**Sung minus shown, confident words, bar 44 to the end** (word # is the index in the full lyric sequence; negative means the tab showed the word late; vowel-initial words read about 150 ms high, so the "I" rows are not regressions):

| word # | bar before → after | sung − shown before (ms) | after (ms) | score |
|---|---|---|---|---|
| 63 | 44 → 44 | +175 | +175 | 0.57 |
| 66 | 44 → 44 | -61 | -61 | 0.45 |
| 67 | 45 → 45 | -33 | -33 | 0.65 |
| 69 | 46 → 46 | +472 | +472 | 0.79 |
| 70 | 47 → 46 | -1650 | +3 | 0.74 |
| 71 | 48 → 47 | -917 | -209 | 0.35 |
| 72 | 48 → 48 | -653 | +291 | 0.56 |
| 74 | 49 → 49 | -501 | -29 | 0.9 |
| 75 | 50 → 49 | -1834 | +56 | 0.44 |
| 79 | 57 → 57 | -745 | -36 | 0.95 |
| 80 | 58 → 57 | -677 | +32 | 0.69 |
| 81 | 58 → 57 | -949 | -5 | 0.63 |
| 82 | 58 → 58 | -733 | +212 | 0.6 |
| 83 | 61 → 58 | -4920 | +40 | 0.54 |
| 84 | 61 → 58 | -4736 | -13 | 0.35 |
| 89 | 62 → 61 | -941 | +3 | 0.89 |
| 90 | 62 → 62 | -932 | +12 | 0.88 |
| 91 | 62 → 62 | -1005 | -60 | 0.9 |
| 92 | 65 → 62 | -4812 | +148 | 0.8 |
| 93 | 65 → 62 | -5023 | -64 | 0.37 |
| 94 | 65 → 65 | -1249 | -68 | 0.42 |
| 96 | 66 → 66 | -1097 | -152 | 0.59 |
| 97 | 67 → 66 | -1709 | -56 | 0.41 |
| 98 | 67 → 67 | -484 | -12 | 0.91 |
| 100 | 68 → 67 | -1973 | -84 | 0.56 |
| 102 | 69 → 68 | -1922 | -32 | 0.93 |
| 103 | 70 → 69 | -1400 | +17 | 0.39 |
| 107 | 72 → 71 | -941 | +4 | 0.37 |
| 108 | 73 → 72 | -2377 | +220 | 0.93 |
| 109 | 73 → 72 | -2314 | +48 | 0.87 |
| 110 | 74 → 72 | -2613 | +457 | 0.75 |
| 111 | 74 → 73 | -2181 | -55 | 0.47 |
| 112 | 75 → 73 | -3338 | -32 | 0.31 |
| 115 | 76 → 75 | -900 | +44 | 0.99 |
| 116 | 76 → 75 | -937 | +8 | 0.94 |
| 117 | 76 → 75 | -972 | -27 | 0.98 |
| 118 | 76 → 76 | -824 | +121 | 0.44 |
| 120 | 77 → 76 | -2629 | -32 | 0.53 |
| 121 | 78 → 76 | -3085 | -15 | 0.43 |
| 122 | 79 → 77 | -2965 | +814 | 0.3 |
| 126 | 81 → 80 | -2400 | +197 | 0.44 |
| 128 | 83 → 81 | -4078 | -63 | 0.7 |
| 129 | 85 → 81 | -6139 | +1 | 0.48 |
| 130 | 85 → 81 | -7356 | -36 | 0.4 |
| 131 | 85 → 82 | -5851 | +53 | 0.77 |
| 132 | 86 → 82 | -7364 | -43 | 0.65 |
| 133 | 87 → 83 | -7592 | -35 | 0.32 |
| 134 | 89 → 85 | -9089 | -115 | 0.39 |
| 137 | 92 → 86 | -11450 | +121 | 0.41 |
| 140 | 94 → 89 | -10870 | -6 | 0.36 |
| 144 | 98 → 91 | -12555 | -39 | 0.34 |
| 145 | 98 → 91 | -12768 | -15 | 0.47 |
| 147 | 101 → 93 | -15076 | -434 | 0.32 |
| 148 | 101 → 93 | -15185 | -71 | 0.36 |
| 149 | 102 → 94 | -13115 | +818 | 0.41 |
| 151 | 102 → 97 | -10198 | -43 | 0.61 |
| 152 | 104 → 97 | -12991 | -3 | 0.88 |
| 153 | 105 → 98 | -12995 | -6 | 0.9 |
| 154 | 105 → 98 | -12987 | +1 | 0.69 |
| 155 | 105 → 98 | -13235 | -10 | 0.62 |
| 156 | 106 → 101 | -9244 | -34 | 0.92 |
| 157 | 106 → 101 | -9216 | -6 | 0.84 |
| 158 | 106 → 101 | -8989 | -15 | 0.84 |
| 159 | 106 → 102 | -8980 | -6 | 0.61 |
| 160 | 109 → 102 | -13027 | -38 | 0.56 |
| 161 | 109 → 102 | -12562 | +190 | 0.65 |
| 162 | 109 → 102 | -12558 | -42 | 0.35 |
| 163 | 109 → 104 | -9725 | -42 | 0.7 |
| 165 | 110 → 105 | -9761 | -78 | 0.38 |
| 166 | 110 → 105 | -9092 | +354 | 0.94 |
| 167 | 111 → 106 | -10165 | -10 | 0.67 |
| 168 | 111 → 106 | -9940 | -22 | 0.8 |
| 169 | 112 → 106 | -11133 | -34 | 0.49 |
| 172 | 113 → 109 | -8316 | -50 | 0.85 |
| 173 | 114 → 109 | -8755 | -18 | 0.58 |
| 179 | 116 → 111 | -9500 | -54 | 0.49 |
| 181 | 117 → 112 | -9528 | -81 | 0.79 |
| 182 | 118 → 113 | -8967 | +6 | 0.35 |
| 184 | 119 → 114 | -9484 | -38 | 0.44 |
| 186 | 120 → 115 | -8587 | -85 | 0.93 |
| 187 | 120 → 116 | -8479 | +23 | 0.43 |
| 190 | 122 → 117 | -8919 | +54 | 0.84 |
| 191 | 123 → 117 | -11101 | -2 | 0.87 |
| 193 | 124 → 118 | -10689 | -770 | 0.48 |
| 195 | 124 → 119 | -9051 | -77 | 0.59 |
| 196 | 124 → 120 | -8803 | +171 | 0.52 |
| 197 | 125 → 120 | -9859 | +59 | 0.32 |
| 199 | 125 → 120 | -9472 | -25 | 0.61 |
| 202 | 129 → 122 | -12265 | +488 | 0.5 |
| 203 | 129 → 122 | -12557 | -41 | 0.49 |
| 205 | 130 → 124 | -11601 | +207 | 0.41 |
| 207 | 133 → 125 | -14635 | +7 | 0.86 |
| 208 | 133 → 125 | -14570 | +71 | 0.69 |
| 210 | 133 → 126 | -13458 | +3 | 0.36 |
| 212 | 134 → 129 | -10764 | -137 | 0.94 |
| 213 | 134 → 129 | -10225 | -69 | 0.64 |
| 214 | 134 → 129 | -9724 | -41 | 0.75 |
| 215 | 134 → 129 | -9224 | +223 | 0.54 |
| 217 | 134 → 130 | -7563 | -5 | 0.99 |
| 221 | 134 → 133 | -2659 | -533 | 0.31 |
| 222 | 134 → 133 | -1919 | -29 | 0.58 |


## Recording sync points — Last Nite `meta.json` (re-measured 2026-11-27)

*Why:* the tab cursor ran slightly behind the recording. The earlier points
came from a fit to word onsets, and the onset aligner and the singer's
phrasing both sit a little behind the beat. The points are now measured
from the instruments. Only `syncPoints` changed.

*How the points were measured:*
- **Instruments.** The tab's note onsets were cross-correlated with Demucs
  drum, bass and guitar stems in 8-bar windows. The record holds 104.00 bpm.
  Window-to-window wobble stays within ±18 ms, with no trend.
- **The ending.** The windows covering bars 77–85 were left out. The
  recording (193.4 s) ends during bar 84, before the tab does, so those
  windows run past the audio.
- **Offset.** The window line puts bar 1 at about 430 ms. A further 10 ms
  shift brings the drum hit check's median offset to within ±10 ms in every
  8-bar block.
- **Drum check.** 83–95% of the tab's drum hits fall within 35 ms of a
  recording onset in every block. The old points managed 9–81%.
- **alphaTab replay.** `Score.applyFlatSyncPoints` followed by
  `MidiFileGenerator.generateSyncPoints` reproduces the intended map to
  within 0.01 ms.

*The points* (written bars, `barOccurence` 0):

| Point | Old (ms) | New (ms) |
|---|---|---|
| Start of bar 1 | 450.2 | 419.6 |
| End of bar 85 | 196628.2 | 196581.0 |

The old points were 31 ms late at bar 1 and 47 ms late at the end.

## Recordings must be CBR: Lazy Eye, Creep and Last Nite re-encoded (2026-11-27)

*Why:* a click-to-seek deep into Lazy Eye landed half a bar to a bar off,
although continuous playback was right. Its tab has one tempo and no
repeats, so the two-point map couldn't be the cause. The recording was a VBR
mp3 (Xing header). Browsers can only estimate seek positions in VBR mp3s,
while seeks in CBR mp3s are exact. Creep and Last Nite were VBR too. Every
other recording is CBR (Info header).

*The edit:* each was re-encoded with
`ffmpeg -i <vbr>.mp3 -map 0:a -c:a libmp3lame -b:a 320k -write_xing 1 recording.mp3`.
Decoded cross-correlation against the original at 5/100/200/300 s gives a
0-sample lag, so `syncPoints` are unchanged. The VBR originals are kept as
`catalog-originals/<song>/recording.vbr.mp3`.

*Rule for new recordings:* check for a `Xing` header
(`python3 -c "import sys;print(b'Xing' in open(sys.argv[1],'rb').read(200000))" f.mp3`)
and re-encode to CBR the same way before fitting sync points.

## kinda-bad-ii/arctic-monkeys-do-i-wanna-know: chorus back on its notes (AFK patch, 2026-11-27)

**Report.** The chorus runs late in bars 30–52.

**Cause.** One word of the first chorus is a single sung syllable, but the raw line writes it as two hyphenated syllables (bar 28). Its second half took the pickup note of the next phrase (29:3.75). Every later word then sat one note late, about an eighth (−350 ms), until the empty skips around bar 51 absorbed the extra syllable. The third chorus repeats the same split at bar 76, but there the second chorus offset it: at 62:3.0 the singer holds the previous word across a legato slide (S2) instead of starting a new one. So bars 61–76 ran one note early (+200 to +430 ms). In the first chorus the same spot is a shift slide, which the dispatcher already skips. The split in the second chorus (bar 60) is fine, since both of its notes are sung there.

**Change.** Raw line only; no .gp note properties changed.
- **Bar 28:** joined the split word into one syllable (deleted one hyphen, raw offset 484).
- **Bar 62:** added a `+` hold on 62:3.0 (offset 1219).
- **Bar 76:** joined the same split word into one syllable (deleted a hyphen, offset 1543).
- **Line breaks:** `lyricLineBreaks` lines 11 and 44 each lose one syllable (sum 405 → 403).
- **LRC:** rebuilt; line texts are unchanged.

**Check.**
- tabcheck reports: 403 of 403 dispatched; no phrase start left empty; no hold on a phrase start; no hyphenated word split across rests; line breaks consistent.
- I re-aligned the vocal stem against the patched song. Confident words more than 268 ms off: 75 before, 9 after.

| bars | before: median (ms), words > 268 ms off | after |
|---|---|---|
| 25–28 | -28, 0 of 10 | -28, 0 of 10 |
| 29–32 | -359, 11 of 12 | +23, 1 of 12 |
| 33–36 | -348, 11 of 12 | -77, 0 of 13 |
| 37–40 | -277, 7 of 12 | -40, 0 of 11 |
| 41–44 | -228, 4 of 9 | -1, 0 of 10 |
| 45–48 | -370, 16 of 19 | -14, 0 of 18 |
| 49–52 | -519, 13 of 17 | +16, 0 of 18 |
| 53–56 | +26, 1 of 14 | +57, 0 of 13 |
| 57–60 | +38, 0 of 9 | +38, 0 of 9 |
| 61–64 | +206, 3 of 11 | +32, 0 of 10 |
| 65–68 | +270, 4 of 7 | -92, 0 of 8 |
| 69–72 | +3218, 1 of 1 | +1100, 1 of 1 |
| 73–76 | +426, 6 of 7 | -42, 0 of 7 |
| 77–80 | +27, 2 of 13 | +27, 2 of 13 |
| 81–84 | -66, 2 of 8 | -66, 2 of 8 |
| 85–88 | -825, 2 of 3 | -825, 2 of 3 |

These words are still off, and I left them alone:
- **29:4.0 and 77:3.75–4.0:** a phrase's first word, aligned 2.4–2.7 s early. The backing vocal probably overlaps it.
- **70:1.0:** +1.1 s, the start of a word split across a rest.
- **Outro, bars 81–88:** two to three weak words.

**Hashes.**

| | before | after |
|---|---|---|
| .gp | `487d32628d92c4e2cdd5e408eab5238832feb619c484daa0adcf563c34a39571` | gpif `241958338b611f8a5a0d4766f9825b827d04bcba10525c5cc07f35a9b2c2057f` (the zip isn't byte-reproducible) |
| meta.json | `a8a1e672ad55bed4a98fc29a271b507d8f4526b2aee39f84d80dd701a5e73221` | `86b64dbb5a3b0e2d4a0591bc1575dca53031efbcb3c56fe69ed1e7c9f3646e24` |
| lyrics.lrc | `0bc0e3c56455fd3301a536ef6dadf35a0d5f85ac23d13d97a0dccd177b9d6fc0` | `33cb0d1a0502ca2b6eef6e2ee82a2972e8943602ce828296097e6f7d17ac4d1a` |

**Reapply** with `reapply.sh <repo root>`. It checks every input and output hash:

```bash
#!/usr/bin/env bash
# Reapply the AFK lyric patch for catalog/kinda-bad-ii/arctic-monkeys-do-i-wanna-know (usage: reapply.sh <repo root>). Refuses unless the song is in its pre-patch state.
set -euo pipefail
R=$1; D="$R/catalog/kinda-bad-ii/arctic-monkeys-do-i-wanna-know"; G="Arctic Monkeys-Do I Wanna Know_-11-18-2026.gp"; W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
h() { shasum -a 256 "$1" | cut -c1-64; }
chk() { [ "$(h "$1")" = "$2" ] || { echo "hash mismatch: $3"; exit 1; }; }
chk "$D/$G" 487d32628d92c4e2cdd5e408eab5238832feb619c484daa0adcf563c34a39571 "original .gp"; chk "$D/meta.json" a8a1e672ad55bed4a98fc29a271b507d8f4526b2aee39f84d80dd701a5e73221 "original meta.json"; chk "$D/lyrics.lrc" 0bc0e3c56455fd3301a536ef6dadf35a0d5f85ac23d13d97a0dccd177b9d6fc0 "original lyrics.lrc"
jq -j .lyricsRawLine "$D/meta.json" > "$W/old.txt"; chk "$W/old.txt" b4b6368c19e5d255aac5a4dfc2ac5338f9551eac66e27726bf8c8fdb21d6e52b "original raw line"
python3 -I - "$W/old.txt" "$W/new.txt" <<'PY'
import json, sys
t = open(sys.argv[1], encoding="utf-8").read()
for off, n, ins in sorted(json.loads('[[484, 1, ""], [1219, 0, "+ "], [1543, 1, ""]]'), reverse=True):   # [offset, deleted length, inserted syntax]
    t = t[:off] + ins + t[off + n:]
open(sys.argv[2], "w", encoding="utf-8").write(t)
PY
chk "$W/new.txt" ec6c657f12eb2ef7770dd0e598ef5a7bd2610e8e67bf5be38f5f870e7cfec31b "new raw line"
cp "$D/$G" "$W/in.gp"
if [ '-' != '-' ]; then
python3 -I - '-' "$W/in.gp" "$W/fixed.gp" <<'PY'
import json, re, sys, zipfile
WANT = json.loads(sys.argv[1]); src, dst = sys.argv[2:4]
z = zipfile.ZipFile(src); g = z.read("Content/score.gpif").decode("utf-8")
users = re.findall(r'<Beat id="(\d+)">(?:(?!</Beat>).)*?<Notes>([^<]*)</Notes>', g, re.S)
for nid, beats in WANT.items():   # remove the shift slide from each note, which must be used only by these beats
    assert sorted(b for b, ns in users if nid in ns.split()) == sorted(beats), nid
    m = re.search(rf'<Note id="{nid}">.*?</Note>', g, re.S); blk = m.group(0)
    p = re.search(r'\n\s*<Property name="Slide">\s*<Flags>1</Flags>\s*</Property>', blk); assert p, nid
    g = g[: m.start()] + blk[: p.start()] + blk[p.end():] + g[m.end():]
with zipfile.ZipFile(dst, "w") as out:
    for info in z.infolist():
        if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename: continue
        out.writestr(info, g.encode("utf-8") if info.filename == "Content/score.gpif" else z.read(info), compress_type=info.compress_type)
PY
else cp "$W/in.gp" "$W/fixed.gp"; fi
python3 -I "$R/tools/catalog-patches/gp-replace-raw-line.py" "$W/fixed.gp" "$(jq .lyricsTrackIndex "$D/meta.json")" "$W/old.txt" "$W/new.txt" "$W/$G" >/dev/null
[ "$(unzip -p "$W/$G" Content/score.gpif | shasum -a 256 | cut -c1-64)" = 241958338b611f8a5a0d4766f9825b827d04bcba10525c5cc07f35a9b2c2057f ] || { echo "patched gpif differs"; exit 1; }
echo '[8, 12, 10, 9, 9, 12, 8, 6, 15, 13, 7, 8, 7, 12, 5, 7, 4, 5, 4, 5, 7, 5, 5, 6, 9, 11, 14, 15, 12, 12, 8, 8, 7, 12, 5, 7, 4, 5, 4, 5, 7, 5, 5, 7, 8, 7, 12, 8, 8, 9]' > "$W/breaks.json"
jq --rawfile r "$W/new.txt" --slurpfile b "$W/breaks.json" '.lyricsRawLine=$r | .lyricLineBreaks=$b[0]' "$D/meta.json" > "$W/meta.json"
chk "$W/meta.json" 86b64dbb5a3b0e2d4a0591bc1575dca53031efbcb3c56fe69ed1e7c9f3646e24 "new meta.json"
cp "$D/lyrics.lrc" "$W/lyrics.in.lrc"
if [ '-' != '-' ]; then
python3 -I - "$W/lyrics.in.lrc" '-' <<'PY'
import re, sys
p, spec = sys.argv[1], sys.argv[2]; ln, keep = map(int, spec.split(":")); out, n = [], 0
for l in open(p, encoding="utf-8").read().split("\n"):   # keep only the first `keep` words of the ln-th text line
    m = re.match(r"^(\[\d+:\d+\.\d+\])(.*)$", l)
    if m and m.group(2):
        n += 1
        if n == ln: l = m.group(1) + " ".join(m.group(2).split(" ")[:keep])
    out.append(l)
open(p, "w", encoding="utf-8").write("\n".join(out))
PY
fi
# rebuild-lrc on the patched copy; passes the playback order if the repo's copy predates the 5-argument buildLrc
mkdir -p "$W/song"; cp "$W/$G" "$W/meta.json" "$W/song/"; cp "$W/lyrics.in.lrc" "$W/song/lyrics.lrc"
sed -e "s#'../../packages/pipeline/src/#'$R/packages/pipeline/src/#g" "$R/tools/catalog-patches/rebuild-lrc.ts" > "$W/rebuild.ts"
grep -q buildPlaybackOrder "$W/rebuild.ts" || sed -i.bak -e "s/buildTickToMs } from/buildTickToMs, buildPlaybackOrder } from/" -e "s/buildLrc(lines, breaks, syllables, tickToMs)/buildLrc(lines, breaks, syllables, buildPlaybackOrder(score), tickToMs)/" "$W/rebuild.ts"
(cd "$R/packages/pipeline" && ./node_modules/.bin/tsx "$W/rebuild.ts" "$W/song" - "$W/lyrics.lrc" >/dev/null)
chk "$W/lyrics.lrc" 33cb0d1a0502ca2b6eef6e2ee82a2972e8943602ce828296097e6f7d17ac4d1a "new lyrics.lrc"
cp "$W/$G" "$D/$G"; cp "$W/meta.json" "$D/meta.json"; cp "$W/lyrics.lrc" "$D/lyrics.lrc"
echo "patched catalog/kinda-bad-ii/arctic-monkeys-do-i-wanna-know"
```

## kinda-bad-ii/the-all-american-rejects-dirty-little-secret: last chorus and outro (AFK patch, 2026-11-27)

**Report.** Words are misplaced from bar 93 on, especially in bars 95–101. The LRC needed regenerating on the playback (repeat-unrolled) time base.

**What's sung.** The tab repeats bars 90–93, with endings at 93 and 94. In the recording, the two passes of bars 90–92 carry different words:
- **Pass 1:** the first half of the chorus line.
- **Pass 2:** the second half, the six words the tab had written after the repeat in bars 94–96.

I aligned the stem against the "sung once" word order and against the tab's unrolled order. The "sung once" order scored better (mean score 0.38 against 0.33 over the last 40 words). Its words in pass 2 of bars 90–91 were confident (0.96 and 0.90), on the same beats as the matching words in bars 86–87.

**Cause.** The tab's lyric line does both things:
- it puts the second half of the chorus after the repeat, where it isn't sung;
- it splits the chorus's last word over three syllables, with the second on a shift-slide origin the dispatcher skips (91:4.0).

So bars 93–101 were 0.6–5.4 s late.

**Change.**
1. **.gp:** removed the shift slide from GPIF note 31. Only beat 326 uses it, at bar 91:4.0. The word's second syllable is sung there, as on the same melody in bar 83.
2. **Raw line, from bar 90 on:**
   - The split word now has two syllables, plus a `+` hold on the bar 92 whole note.
   - The word at 93:3.5–4.0 is now hyphenated over both notes.
   - Deleted the six words after the repeat (36 characters at offset 1135). The dispatcher can't show them in pass 2 of bars 90–92, and leaving them in pushes the outro late.
   - Added holds in bars 95–97 and a two-syllable split at 97:3–4, so the outro words land where they're sung.
3. **meta.json:** `lyricLineBreaks` lines 33 (−6) and 35 (+1); sum 293 → 285.
4. **LRC:**
   - Cut line 33's text to its first 10 words, matching the syllables that remain.
   - Rebuilt the LRC with the current `buildLrc`, which unrolls repeats. Line 33 is now written once per pass, and every timestamp from that line on is on the playback timeline. Lines 1–32 are unchanged.

**Limitation.** In pass 2 of bars 90–92, the tab shows pass 1's words while the singer sings the second half of the line. Showing that would need per-pass lyric lines, an app feature. The `.gp` format has lyric lines 2–5 for this, but the dispatcher and `unrollSyllables` use one line.

**Check.**
- tabcheck reports: 285 of 285 dispatched; nothing left after the last syllable except two unsung notes in bar 101; line breaks consistent.
- I re-aligned the stem against the patched song. Confident words more than 268 ms off: 22 before, 8 after. The remaining 8 are the isolated words at bars 13, 22, 30, 33, 41, 48 and 59 that were already listed as aligner misses, and I left them alone.

| bars | before: median (ms), words > 268 ms off | after |
|---|---|---|
| 81–84 | +11, 0 of 4 | +11, 0 of 4 |
| 85–88 | +17, 0 of 6 | +17, 0 of 6 |
| 89–92 | -22, 1 of 4 | -22, 0 of 4 |
| 93–96 | -5280, 5 of 5 | +11, 0 of 3 |
| 97–100 | -844, 7 of 7 | -9, 0 of 8 |
| 101–101 | -854, 1 of 1 | — |

**Hashes.**

| | before | after |
|---|---|---|
| .gp | `a1d10279a5f5eb393e171f7611b8902f9cd3d02cb92ee7eef46fa8a9f4606e96` | gpif `2f2229b460c0cdf521291d39848b4ce7b69263dacd28c3074099d926554aeba7` |
| meta.json | `19263387cbd1bba96ddb9dbd2433c6f50cb8d52c896f987036605c6c46f24e6d` | `9e81c65b4a0936a83daa58fdba9a4ffe504bdc78f6d5d35e6542a85c28915b6a` |
| lyrics.lrc | `8de290b136ab3e5d9a7b9c71aa12c4e07fbb2992e06b40e11b7045bfd56be27e` | `b6f9f935685908050fcce89162ce2e12c398d66aecc1aab869a4ad28c4a8a796` |

**Reapply** with `reapply.sh <repo root>`:

```bash
#!/usr/bin/env bash
# Reapply the AFK lyric patch for catalog/kinda-bad-ii/the-all-american-rejects-dirty-little-secret (usage: reapply.sh <repo root>). Refuses unless the song is in its pre-patch state.
set -euo pipefail
R=$1; D="$R/catalog/kinda-bad-ii/the-all-american-rejects-dirty-little-secret"; G="The All-American Rejects-Dirty Little Secret-10-17-2026.gp"; W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
h() { shasum -a 256 "$1" | cut -c1-64; }
chk() { [ "$(h "$1")" = "$2" ] || { echo "hash mismatch: $3"; exit 1; }; }
chk "$D/$G" a1d10279a5f5eb393e171f7611b8902f9cd3d02cb92ee7eef46fa8a9f4606e96 "original .gp"; chk "$D/meta.json" 19263387cbd1bba96ddb9dbd2433c6f50cb8d52c896f987036605c6c46f24e6d "original meta.json"; chk "$D/lyrics.lrc" 8de290b136ab3e5d9a7b9c71aa12c4e07fbb2992e06b40e11b7045bfd56be27e "original lyrics.lrc"
jq -j .lyricsRawLine "$D/meta.json" > "$W/old.txt"; chk "$W/old.txt" ad279d1447cf89cba517c1c8e0aeb318598631783b9e6a78113ba11440be155d "original raw line"
python3 -I - "$W/old.txt" "$W/new.txt" <<'PY'
import json, sys
t = open(sys.argv[1], encoding="utf-8").read()
for off, n, ins in sorted(json.loads('[[1115, 1, ""], [1117, 0, " +"], [1131, 0, "-"], [1135, 36, ""], [1182, 0, "+ + "], [1185, 0, " +"], [1208, 0, "+ "], [1216, 0, "+ + + "], [1218, 0, "-"]]'), reverse=True):   # [offset, deleted length, inserted syntax]
    t = t[:off] + ins + t[off + n:]
open(sys.argv[2], "w", encoding="utf-8").write(t)
PY
chk "$W/new.txt" f59fa9a9e4c7012f8e87db80203826831eea9a1c1b3944be83b57b94ad918608 "new raw line"
cp "$D/$G" "$W/in.gp"
if [ '{"31": ["326"]}' != '-' ]; then
python3 -I - '{"31": ["326"]}' "$W/in.gp" "$W/fixed.gp" <<'PY'
import json, re, sys, zipfile
WANT = json.loads(sys.argv[1]); src, dst = sys.argv[2:4]
z = zipfile.ZipFile(src); g = z.read("Content/score.gpif").decode("utf-8")
users = re.findall(r'<Beat id="(\d+)">(?:(?!</Beat>).)*?<Notes>([^<]*)</Notes>', g, re.S)
for nid, beats in WANT.items():   # remove the shift slide from each note, which must be used only by these beats
    assert sorted(b for b, ns in users if nid in ns.split()) == sorted(beats), nid
    m = re.search(rf'<Note id="{nid}">.*?</Note>', g, re.S); blk = m.group(0)
    p = re.search(r'\n\s*<Property name="Slide">\s*<Flags>1</Flags>\s*</Property>', blk); assert p, nid
    g = g[: m.start()] + blk[: p.start()] + blk[p.end():] + g[m.end():]
with zipfile.ZipFile(dst, "w") as out:
    for info in z.infolist():
        if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename: continue
        out.writestr(info, g.encode("utf-8") if info.filename == "Content/score.gpif" else z.read(info), compress_type=info.compress_type)
PY
else cp "$W/in.gp" "$W/fixed.gp"; fi
python3 -I "$R/tools/catalog-patches/gp-replace-raw-line.py" "$W/fixed.gp" "$(jq .lyricsTrackIndex "$D/meta.json")" "$W/old.txt" "$W/new.txt" "$W/$G" >/dev/null
[ "$(unzip -p "$W/$G" Content/score.gpif | shasum -a 256 | cut -c1-64)" = 2f2229b460c0cdf521291d39848b4ce7b69263dacd28c3074099d926554aeba7 ] || { echo "patched gpif differs"; exit 1; }
echo '[7, 7, 8, 7, 8, 8, 6, 4, 10, 15, 6, 11, 7, 7, 7, 7, 8, 8, 6, 4, 10, 14, 6, 11, 6, 6, 6, 6, 6, 4, 10, 14, 14, 6, 7, 8]' > "$W/breaks.json"
jq --rawfile r "$W/new.txt" --slurpfile b "$W/breaks.json" '.lyricsRawLine=$r | .lyricLineBreaks=$b[0]' "$D/meta.json" > "$W/meta.json"
chk "$W/meta.json" 9e81c65b4a0936a83daa58fdba9a4ffe504bdc78f6d5d35e6542a85c28915b6a "new meta.json"
cp "$D/lyrics.lrc" "$W/lyrics.in.lrc"
if [ '33:10' != '-' ]; then
python3 -I - "$W/lyrics.in.lrc" '33:10' <<'PY'
import re, sys
p, spec = sys.argv[1], sys.argv[2]; ln, keep = map(int, spec.split(":")); out, n = [], 0
for l in open(p, encoding="utf-8").read().split("\n"):   # keep only the first `keep` words of the ln-th text line
    m = re.match(r"^(\[\d+:\d+\.\d+\])(.*)$", l)
    if m and m.group(2):
        n += 1
        if n == ln: l = m.group(1) + " ".join(m.group(2).split(" ")[:keep])
    out.append(l)
open(p, "w", encoding="utf-8").write("\n".join(out))
PY
fi
# rebuild-lrc on the patched copy; passes the playback order if the repo's copy predates the 5-argument buildLrc
mkdir -p "$W/song"; cp "$W/$G" "$W/meta.json" "$W/song/"; cp "$W/lyrics.in.lrc" "$W/song/lyrics.lrc"
sed -e "s#'../../packages/pipeline/src/#'$R/packages/pipeline/src/#g" "$R/tools/catalog-patches/rebuild-lrc.ts" > "$W/rebuild.ts"
grep -q buildPlaybackOrder "$W/rebuild.ts" || sed -i.bak -e "s/buildTickToMs } from/buildTickToMs, buildPlaybackOrder } from/" -e "s/buildLrc(lines, breaks, syllables, tickToMs)/buildLrc(lines, breaks, syllables, buildPlaybackOrder(score), tickToMs)/" "$W/rebuild.ts"
(cd "$R/packages/pipeline" && ./node_modules/.bin/tsx "$W/rebuild.ts" "$W/song" - "$W/lyrics.lrc" >/dev/null)
chk "$W/lyrics.lrc" b6f9f935685908050fcce89162ce2e12c398d66aecc1aab869a4ad28c4a8a796 "new lyrics.lrc"
cp "$W/$G" "$D/$G"; cp "$W/meta.json" "$D/meta.json"; cp "$W/lyrics.lrc" "$D/lyrics.lrc"
echo "patched catalog/kinda-bad-ii/the-all-american-rejects-dirty-little-secret"
```

## kinda-bad/my-chemical-romance-teenagers: last word, and the chorus re-check (AFK patch 3, 2026-11-27, on top of Patch 2)

**Fixed.** The song's last word was never placed. Bar 73 has one note and then rests, so the raw line's final syllable ran out of beats. The original download already had this problem, so Patches 1 and 2 didn't cause it. The 7 phrase-start notes that tabcheck lists as carrying a `+` hold also date from Patch 1. That also left `lyricLineBreaks` summing to 355 against 354 dispatched, so rebuild-lrc refused to run.

**Change:**
- **Raw line:** the final word is joined onto the note before it, 73:1.0 (the last space becomes `+`, offset 1712).
- **Line breaks:** the last `lyricLineBreaks` entry goes from 10 to 9 (sum 354).
- **LRC:** rebuilt; it comes out byte-identical, because the last line's timing doesn't change.
- **.gp:** no note changes.

**Re-checked and left alone:**
- **Chorus "me", the end of the first chorus line** (bars 19, 35, 51, 59, 67). It's sung 0.37–0.65 s after the note it's joined to, during the rest at beat 3.5. Bar 51 is the confident one (0.93). The next note is the following bar's beat 1, which would show it 0.8–1.4 s late instead, so the current early placement is the closer one. Fixing it would need a notation change (a note in that rest) or an app feature that shows a syllable over a rest.
- **"bleed"** (bars 21, 37, 53, 61, 69). All weak scores (0.15–0.28), at ±0.3–0.5 s, and also sung over the rest after the note. No clear direction.
- **"scare"** (bars 18, 34, 50, 58, 66). Shown 140–300 ms late. Each time it's sung early, toward the held note before it. Only bar 50 is confident (0.54). Under half a beat, so I made no change.
- **"gun" and "son"** (bars 6–7). +151 ms and +189 ms (0.92 and 0.96) after Patch 2, under half a beat.
- **Bars 25–40** run a steady +130 to +157 ms (sung later than shown). That's a sync-like offset, not placement.
- **Bar 4's "out"/"of"** read +417 and +338 ms in this pass. Patch 2's evidence, and the user's ear, put "out" on 4:2.5, so I left it.

**Hashes.**

| | before (Patch 2) | after |
|---|---|---|
| .gp | `1311b69196612772fcaf1136555c8597c95d9a60c537e4b2f1804e7387c041ea` | gpif `641cd5c9c8b092affbed8a01ac81639fc8ce13b68623914967bb5d7fd3f74130` |
| meta.json | `0325809eb865b386a8d127d65474b4f9b8b3980c0ce6381b2e5b2addd12f7516` | `e7e9fa296ef4b1505bdbf9923702e995693264593af6980b44d2e3edf723c2fe` |
| lyrics.lrc | `c32d2ecc09ae45d10a5542289dba56a24299b3fa855506eb9e99e6f14c5fe5b6` | unchanged |

**Reapply** with `reapply.sh <repo root>`:

```bash
#!/usr/bin/env bash
# Reapply the AFK lyric patch for catalog/kinda-bad/my-chemical-romance-teenagers (usage: reapply.sh <repo root>). Refuses unless the song is in its pre-patch state.
set -euo pipefail
R=$1; D="$R/catalog/kinda-bad/my-chemical-romance-teenagers"; G="My Chemical Romance-Teenagers-06-02-2026.gp"; W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
h() { shasum -a 256 "$1" | cut -c1-64; }
chk() { [ "$(h "$1")" = "$2" ] || { echo "hash mismatch: $3"; exit 1; }; }
chk "$D/$G" 1311b69196612772fcaf1136555c8597c95d9a60c537e4b2f1804e7387c041ea "original .gp"; chk "$D/meta.json" 0325809eb865b386a8d127d65474b4f9b8b3980c0ce6381b2e5b2addd12f7516 "original meta.json"; chk "$D/lyrics.lrc" c32d2ecc09ae45d10a5542289dba56a24299b3fa855506eb9e99e6f14c5fe5b6 "original lyrics.lrc"
jq -j .lyricsRawLine "$D/meta.json" > "$W/old.txt"; chk "$W/old.txt" 765f4c2666ba149d46472b57b50a2c4ea8e66b1d6ff3f03d32fffce1ba778309 "original raw line"
python3 -I - "$W/old.txt" "$W/new.txt" <<'PY'
import json, sys
t = open(sys.argv[1], encoding="utf-8").read()
for off, n, ins in sorted(json.loads('[[1712, 1, "+"]]'), reverse=True):   # [offset, deleted length, inserted syntax]
    t = t[:off] + ins + t[off + n:]
open(sys.argv[2], "w", encoding="utf-8").write(t)
PY
chk "$W/new.txt" 471d5346d37748390016cc3e71f49d083f26b0552f1a617ba0c9a62ed0418faf "new raw line"
cp "$D/$G" "$W/in.gp"
if [ '-' != '-' ]; then
python3 -I - '-' "$W/in.gp" "$W/fixed.gp" <<'PY'
import json, re, sys, zipfile
WANT = json.loads(sys.argv[1]); src, dst = sys.argv[2:4]
z = zipfile.ZipFile(src); g = z.read("Content/score.gpif").decode("utf-8")
users = re.findall(r'<Beat id="(\d+)">(?:(?!</Beat>).)*?<Notes>([^<]*)</Notes>', g, re.S)
for nid, beats in WANT.items():   # remove the shift slide from each note, which must be used only by these beats
    assert sorted(b for b, ns in users if nid in ns.split()) == sorted(beats), nid
    m = re.search(rf'<Note id="{nid}">.*?</Note>', g, re.S); blk = m.group(0)
    p = re.search(r'\n\s*<Property name="Slide">\s*<Flags>1</Flags>\s*</Property>', blk); assert p, nid
    g = g[: m.start()] + blk[: p.start()] + blk[p.end():] + g[m.end():]
with zipfile.ZipFile(dst, "w") as out:
    for info in z.infolist():
        if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename: continue
        out.writestr(info, g.encode("utf-8") if info.filename == "Content/score.gpif" else z.read(info), compress_type=info.compress_type)
PY
else cp "$W/in.gp" "$W/fixed.gp"; fi
python3 -I "$R/tools/catalog-patches/gp-replace-raw-line.py" "$W/fixed.gp" "$(jq .lyricsTrackIndex "$D/meta.json")" "$W/old.txt" "$W/new.txt" "$W/$G" >/dev/null
[ "$(unzip -p "$W/$G" Content/score.gpif | shasum -a 256 | cut -c1-64)" = 641cd5c9c8b092affbed8a01ac81639fc8ce13b68623914967bb5d7fd3f74130 ] || { echo "patched gpif differs"; exit 1; }
echo '[7, 7, 9, 6, 6, 8, 7, 7, 8, 7, 7, 10, 13, 10, 12, 10, 7, 7, 8, 7, 7, 9, 12, 10, 12, 9, 1, 12, 10, 12, 10, 5, 9, 10, 12, 10, 10, 10, 12, 9]' > "$W/breaks.json"
jq --rawfile r "$W/new.txt" --slurpfile b "$W/breaks.json" '.lyricsRawLine=$r | .lyricLineBreaks=$b[0]' "$D/meta.json" > "$W/meta.json"
chk "$W/meta.json" e7e9fa296ef4b1505bdbf9923702e995693264593af6980b44d2e3edf723c2fe "new meta.json"
cp "$D/lyrics.lrc" "$W/lyrics.in.lrc"
if [ '-' != '-' ]; then
python3 -I - "$W/lyrics.in.lrc" '-' <<'PY'
import re, sys
p, spec = sys.argv[1], sys.argv[2]; ln, keep = map(int, spec.split(":")); out, n = [], 0
for l in open(p, encoding="utf-8").read().split("\n"):   # keep only the first `keep` words of the ln-th text line
    m = re.match(r"^(\[\d+:\d+\.\d+\])(.*)$", l)
    if m and m.group(2):
        n += 1
        if n == ln: l = m.group(1) + " ".join(m.group(2).split(" ")[:keep])
    out.append(l)
open(p, "w", encoding="utf-8").write("\n".join(out))
PY
fi
# rebuild-lrc on the patched copy; passes the playback order if the repo's copy predates the 5-argument buildLrc
mkdir -p "$W/song"; cp "$W/$G" "$W/meta.json" "$W/song/"; cp "$W/lyrics.in.lrc" "$W/song/lyrics.lrc"
sed -e "s#'../../packages/pipeline/src/#'$R/packages/pipeline/src/#g" "$R/tools/catalog-patches/rebuild-lrc.ts" > "$W/rebuild.ts"
grep -q buildPlaybackOrder "$W/rebuild.ts" || sed -i.bak -e "s/buildTickToMs } from/buildTickToMs, buildPlaybackOrder } from/" -e "s/buildLrc(lines, breaks, syllables, tickToMs)/buildLrc(lines, breaks, syllables, buildPlaybackOrder(score), tickToMs)/" "$W/rebuild.ts"
(cd "$R/packages/pipeline" && ./node_modules/.bin/tsx "$W/rebuild.ts" "$W/song" - "$W/lyrics.lrc" >/dev/null)
chk "$W/lyrics.lrc" c32d2ecc09ae45d10a5542289dba56a24299b3fa855506eb9e99e6f14c5fe5b6 "new lyrics.lrc"
cp "$W/$G" "$D/$G"; cp "$W/meta.json" "$D/meta.json"; cp "$W/lyrics.lrc" "$D/lyrics.lrc"
echo "patched catalog/kinda-bad/my-chemical-romance-teenagers"
```

## kinda-bad/radiohead-creep: "But" and "What" over rests (AFK check, 2026-11-27): no change

**Measured.** In bar 48, "But" is shown 0.54 s after it's sung, and so is "What" in bar 52. The other chorus instances, at bars 24, 28, 80 and 84, are within 0.12 s. In bars 48 and 52, each word is already on the first note after a rest: 48:2.75, joined with the next word, and 52:2.33, joined with the next word. The singer starts it during the rest.

**Why it isn't fixable in the raw line.** A syllable can only sit on a note. Holding it on the preceding note would show it much earlier than it's sung:
- **"But":** the note before is 47:1.5, a dotted half that ends at 47:4.5. Starting there would show the word about 2.2 s early instead of 0.54 s late.
- **"What":** the note before is the 51:2.75 tie chain, about 1.1 s early.

The current placement is already the closer one. A real fix would need either a vocal note written into the rest (a .gp rhythm change, not a property change) or an app feature that shows a phrase's first syllable a little ahead of its note.

**Also seen, unchanged.** Bars 38 and 40 are sung about one sixteenth ahead of the tab, 0.2–0.35 s, from the first word of each phrase on. It's the same anticipation over the preceding rest. This isn't the user-verified bridge (bars 62–63), and I made no change.

No files changed.

## Vocal tracks for Low and Lazy Eye: syllable-timed lyrics (2026-11-27)

*Songs:* `kinda-bad-ii/cracker-low` (`Cracker-Low-05-09-2026.gp`) and
`kinda-bad/silversun-pickups-lazy-eye`
(`Silversun Pickups-Lazy Eye-06-29-2026.gp`).

*Why:* neither tab has a vocal track, and no instrument track follows the
sung rhythm closely enough to carry a dispatched lyric line (measured
earlier the same day: at best 65% of confident words within a 16th for Low,
81% for Lazy Eye). Both songs therefore had only line-timed lrclib lyrics.
The user chose to add a vocal track built from the recording.

*The edit:* each `.gp` gets one new track **appended** after the existing
ones, so no existing `trackIndex` moves: Low track 5 (`David Lowery -
Vocals`), Lazy Eye track 7 (`Brian - Vocals`). The new track has one plain
note per sung syllable (no ties, grace notes or slides), rests elsewhere,
and a raw lyric line with one chunk per note: the existing LRC's lyric
lines, one raw line each, words cut into syllables with `-`, no `+` or `_`.
A hyphen already in the LRC text (Low's repeated interjections) is written
as a space instead, because the app joins `-` pieces back into one word
when it shows a raw line.
Its sound mirrors the other catalog vocal tracks: Voice Oohs (GM 53), not
muted, guitar tuning so the tab view shows frets. Nothing else in the file
changes. Removing the added elements and ids gives back the original
`score.gpif` byte for byte, and the other zip entries are untouched.

How the notes were made (`tools/catalog-patches/vocal-align.py`,
`vocal-place.py`, `gp-add-vocal-track.py`; each has a usage docstring):
1. Syllable starts are found by force-aligning the LRC text against the Demucs
   vocal stem (wav2vec2, whole song in one pass). Pitch and voicing come from
   pYIN on the same stem.
2. Recording ms are mapped to tab ticks through the song's existing
   `syncPoints` (inverse of the app's mapping). Vowel-initial words are moved
   140 ms earlier.
3. Low-score syllables (< 0.3) outside their LRC line's window are
   interpolated: Low has 2, in bars 54 and 90; Lazy Eye has 1, in bar 64.
4. Syllables go onto a 16th grid by a monotone DP, so no two share a note.
   Each note lasts while the voice does, cut to one note value inside the bar.
5. Pitch is the pYIN median, octave-folded against its neighbors.

Then `extract-lyrics` was run from the patched copy. The raw line has
several lines, so line breaks come from it (`countSyllables`), no lrclib
query is made, and `lyrics.lrc` is GP-derived (tab time). `meta.json` gets:
- `lyricsTrackIndex` 5 / 7;
- `lyricsRawLine`;
- `trackNames`;
- 40 lines / 308 syllables (Low) and 26 lines / 194 syllables (Lazy Eye).

`syncPoints` and every other hand-set key are unchanged. The existing part
names were reset by the run (neither `meta.json` had `trackNames` yet, and
the track count changed), so they were restored from the backup. A
`<Singer> (Vocals)` part was then added. Both are in
`docs/catalog-part-names.json`.

*Result,* measured the same way as the earlier attempt, against that
attempt's own alignment. It is the app's shown time (`app-times.ts`) against
the sung start of each confident word, with the vowel correction:

| Song | Confident | Within a 16th | Beyond an 8th | Max |
|---|---|---|---|---|
| Low (16th = 172 ms) | 190 words | 100% | 0% | 86 ms |
| Lazy Eye (16th = 118 ms) | 91 word starts | 100% | 0% | 92 ms |
| Lazy Eye, all confident syllables | 118 | 96.6% | 0% | 197 ms |

This bar is close to circular. The notes were placed from the same kind of
alignment, so it mostly measures quantization. The cross-check is
independent but weak: how many shown syllables fall within a 16th of an
onset detected in the vocal stem.
- Low: 85.7% of all 308 syllables, against 61% by chance.
- Lazy Eye: 74.2% of all 194, against 55% by chance.

The places most worth checking by ear are where the aligner was unsure:
- Low, outro bars 82–97;
- Lazy Eye, bars 92–104 and the last lines, bars 176–179.

*Reapplying:* backups of the three original files are in the gitignored
`catalog-originals/<collection>/<song>/pre-vocal-2026-11-27/`. The build
inputs are in `…/vocal-build-2026-11-27/`, local only because they contain
lyric text: `align.json`, `split-spec.json`, `notes.json`, `raw-line.txt`.
From the repo root, with `S=kinda-bad-ii/cracker-low`,
`G=Cracker-Low-05-09-2026.gp`, `N="David Lowery - Vocals"` (or
`S=kinda-bad/silversun-pickups-lazy-eye`,
`G="Silversun Pickups-Lazy Eye-06-29-2026.gp"`, `N="Brian - Vocals"`):

```sh
B=catalog-originals/$S/vocal-build-2026-11-27; W=$(mktemp -d)
python3 -I tools/catalog-patches/gp-add-vocal-track.py \
  "catalog-originals/$S/pre-vocal-2026-11-27/$G" $B/notes.json $B/raw-line.txt "$N" "$W/$G"
pnpm --filter @sync-tab-scroll/pipeline extract-lyrics "$W/$G" "$PWD/catalog/${S%/*}"
# then reapply the part names (see "Part names" above)
```

To rebuild `notes.json` and `raw-line.txt` from scratch, use the same LRC,
spec and stem. This needs the alignment venv; see `tools/timing/README.md`,
plus `librosa` and `pyphen`.
- `vocal-align.py <pre-vocal lyrics.lrc> $B/split-spec.json <vocals.wav> align.json`
- `vocal-place.py align.json <pre-vocal lyrics.lrc> <pre-vocal meta.json> <pre-vocal .gp> <out dir>`

Expected sha256 after the patch:

| File | sha256 |
|---|---|
| Low `.gp` | `7df28b4538e60d496d73bd7541cd0d35d73c397247189c6108f74867521c0678` |
| Low `lyrics.lrc` | `b57121b5900a943a8539800eeb8aaaec78283a9cfe7e66d00237df03b3ae797b` |
| Lazy Eye `.gp` | `780a12645e32a7be2d1ba3eb93baee98c5cfa9393773231f46f2e5d6a07d1990` |
| Lazy Eye `lyrics.lrc` | `7a4f01fd358158fc8b1096ccfda9830db627cdbf743566e604a9db4c26ef8089` |

Originals: Low `.gp` `f8a2c139…5e65`, Lazy Eye `.gp` `f77a3aeb…92ff`.
