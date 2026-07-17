---
status: planned      # open -> planned
created: 2026-07-17
plan: plan-1619-2026-07-17-39c6.md
---

# Feedback

Source: user's manual live-testing pass on "Time Is Running Out" (Muse,
`catalog/kinda-bad/muse-time-is-running-out/`) in the local dev instance.
Two related but mechanically distinct lyrics-timing bugs. Investigated in
two passes: a static parse of the song's `.gp` file (`@coderline/alphatab`
`ScoreLoader`) against the `M. Bellamy (Vocals)` track
(`lyricsTrackIndex: 1`), then a live instrumented browser session
(2026-07-17) that tapped the real audio output with an `AnalyserNode` and
correlated audible note onsets against `playerPositionChanged` ticks and
the ticker's highlighted syllable.

## Bugs

- [x] F001 In-tab lyrics ticker (instrument-part Playback View) reported
  ~2 syllables ahead of the audible playback ("be" highlighted when "You"
  is sung, on the first "You will be the death of me"). Live instrumented
  measurement could NOT reproduce any code-level offset on the dev
  machine: (a) the ticker's highlight transitions match the client walk's
  `beat.absolutePlaybackStart` ticks exactly (e.g. "death" walked at tick
  65280, highlight flips at reported tick 65285 — within one position
  event; verified across dozens of syllables including the reported
  passage); (b) with the vocal track soloed and the real audio output
  tapped via an interposed `AnalyserNode`, audible note onsets land within
  ~50 ticks (~25-40 ms) of the engine's reported tick (phrase onsets at
  reported 76848/81171/88864/96534 vs. score ticks 76800/81120/88800/96480);
  alphaTab derives `playerPositionChanged` from samples actually consumed
  by the audio output node, so reported tick ≈ samples handed to the
  AudioContext. Also ruled out: the prior T004 fix's mechanism is a no-op
  for this file — `masterBar.start + beat.playbackStart` equals
  `absolutePlaybackStart` on every beat of this song (0 diffs), so this is
  NOT a residual case of the lyrics-ticker plan's F001; repeats, ties,
  grace notes, tempo automation, and count-in (alphaTab suppresses
  position events during count-in; the overlay is a pure function of
  `currentTick`) are all ruled out too. Leading remaining hypothesis:
  **uncompensated audio output latency on the user's playback device** —
  alphaTab never subtracts `AudioContext.outputLatency`/`baseLatency` from
  reported position; on the dev-machine measurement it was 32 ms
  (invisible), but Bluetooth output commonly adds 300-500 ms, and 500 ms at
  118 bpm ≈ 960 ticks ≈ exactly the observed 2-eighth-syllable gap. The
  tab cursor is equally ahead but its continuous animation masks it, while
  discrete syllable flips make the ticker's lead obvious. Needs one fact
  from the user: what audio output device was in use, and whether the
  offset shrinks/vanishes on built-in speakers. If confirmed, the fix is
  latency compensation in the overlay (shift the compare tick by
  `(ctx.baseLatency + ctx.outputLatency)` converted to ticks, refreshed
  per device change) — and the same compensation arguably belongs on the
  cursor. Secondary note: the sung "And" pickup exists as an unlabeled
  note (tick 44160, dur 960, `lyrics: null`) before "You"@45120; the
  label-to-melody alignment is nonetheless consistent with the song (the
  held 1920-tick note at 46080 carries "be"), so this is a perceptual
  confusion risk, not a timing bug. [artifacts: ui]

- [x] F002 The full lyric sheet (Lyrics-part Playback View, driven by
  `CatalogSong.lyricsLrc`) progressively drifts ahead of the audio — a
  cumulative/growing drift. **Root cause confirmed empirically** (no live
  audio needed; the .lrc timestamps are provably wrong on their own):
  this song's GP raw lyrics blob is a single unbroken line
  (`readRawLyricsLines` returns 1 line — no author line breaks), so
  `packages/pipeline/src/extract-lyrics.ts` took the lrclib fallback path
  and derived `lyricLineBreaks` via `distributeByWordCount()` —
  word-count-proportional rounding of the total GP syllable count (333)
  across lrclib's 44 display lines. Word count is not syllable count:
  line 0 "I think I'm drowning, asphyxiated" was assigned 6 syllables but
  the GP stream has 10 ("drown-ing as-phy-xi-at-ed"), and 41 of 44 lines
  are similarly mis-assigned, so `buildLrc()`'s cursor-sliced windows are
  wrong from the very first boundary and the error compounds: line 4's
  .lrc start is 20.59 s while the true GP tick of its first syllable
  ("You"@45120) is ~23.9 s — already ~3.3 s ahead, growing later. Totals
  only balance (333=333) because `distributeByWordCount` dumps the
  rounding residue on the final line (assigned 19 vs ~6 real syllables).
  Fix direction: replace proportional distribution with an actual
  alignment of the GP syllable stream to the lrclib line texts
  (normalize: strip hyphens/punctuation/case, then greedily consume GP
  syllables per line word-by-word), and/or place line boundaries by
  proximity of GP syllable times to lrclib's own synced timestamps —
  either gives per-line counts grounded in the real stream instead of a
  ratio. [artifacts: pipeline, datamodel]

- [x] F003 (found during this investigation) Pipeline and client walk the
  same GP data with divergent logic, and one side is wrong for this song:
  `packages/pipeline/src/gp-parser.ts#extractSyllables` (i) still uses the
  pre-T004 `bar.masterBar.start + beat.playbackStart` tick source (a no-op
  for this file but divergent from the client's `absolutePlaybackStart`
  and re-exposed to the grace-note bug T004 fixed), and (ii) does NOT
  collapse consecutive same-text beats, while
  `client/src/lyrics-beat-walk.ts` does. For this song the dedup collapses
  23 *genuinely distinct repeated sung syllables* (the "Ooh, yeah, yeah,
  yeah…" runs — each "yeah," is its own note/beat, not a melisma
  continuation), so the client stream has 310 syllables vs. the
  pipeline's/`lyricLineBreaks`' 333: `groupIntoLines()` misgroups from
  the first "yeah" run onward, and repeated "yeah"s never re-advance the
  ticker highlight. The Creep-validated dedup heuristic (same text ⇒
  melisma) is unsound — repeated-word lyrics are common. A correct
  discriminator likely needs note/tie inspection (a melisma continuation
  beat repeats the label on a tied/sustained note) or alphaTab's own
  chunk-dispatch data, and pipeline + client should share one walk
  implementation so `lyricLineBreaks` and the client stream can never
  disagree. [artifacts: pipeline, ui, datamodel]

F002 (and F003's count mismatch) are confirmed and fixable now. F001 needs
one piece of user-supplied ground truth (audio output device / whether the
offset tracks output latency) before a fix is designed — everything
code-side measured correct to within ~40 ms on low-latency output.
