---
status: planned      # open -> planned
created: 2026-07-18
plan: plan-creep-dispatch-2026-07-18-8a7c.md
---

# Feedback

Context: user ear/eye-check of "Creep" (catalog
`kinda-bad/radiohead-creep`) immediately after the lyrics-dispatch fix
shipped (`plan-lyrics-dispatch-2026-07-18-8090.md`, merged `e37437d`).
TIRO verified correct; Creep — the tie-heaviest catalog song — is not.
Partial live diagnosis was done in-session (details per item).

## Bugs

- [x] F001 Creep's ticker highlights syllables early: clicking bar 16's
  first note highlights "You" (of "You float"), which isn't sung until
  roughly halfway through bar 16; the ticker shows "You" before the
  measure-15 divider ("...makes me cry You |15 |16"). Diagnosed: the new
  dispatcher places "You" at tick 53280 (last note of bar 14) where the
  correct beat is 59040 (mid-bar 16) — exactly one singable beat of
  drift at that point. alphaTab's own pre-fix dispatch was also wrong
  here (same region), so this is not a regression relative to before,
  but the corrected dispatcher still under-skips on this file. Ruled
  out in-session: `startBar` is 0 (not an offset bug); the vocal track
  has zero `isEmpty` beats and only 3 grace beats (neither explains
  it). Key unexplained clue: alphaTab's own dispatch left the real,
  singable note at tick 60480 (bar 16, voice 0, 1 note, not rest/
  empty/grace) with NO lyric while continuing afterward — whatever rule
  made it skip that beat without consuming a chunk is likely the
  missing dispatch rule; find it (read alphaTab's applyLyrics/importer
  path closely, incl. whether GP7 per-beat `<Lyrics>` shells or beat
  `isEmpty`-at-import-time are involved). [artifacts: pipeline,
  infrastructure]

- [x] F002 GP "+" hold markers are mishandled: alphaTab's chunker
  (`Lyrics._prepareChunk`) converts a standalone `+` into a single-space
  `" "` chunk (`split("+").join(" ")`), which the shared dispatcher
  treats as a normal non-empty syllable — it consumes a singable beat
  AND emits a blank `" "` syllable into the stream. Creep's raw line
  has 15 of these (e.g. "But I'm a + creep, I'm a + weir-do + +").
  Correct GP semantics: `+` extends the previous syllable — it should
  consume a beat but emit nothing (like the empty-chunk skip, though
  possibly restricted to singable beats). The emitted blank syllables
  also pollute `lyricLineBreaks` grouping and the ticker's visible
  stream. TIRO was unaffected (its line uses multi-space skips, no
  `+`). [artifacts: pipeline, infrastructure]

- [x] F003 Creep's ticker runs dry before the song ends: from roughly
  bar 84 onward (after "I do-") the ticker shows only measure-number
  dividers with no further lyrics. Consistent with cumulative
  over-consumption (F001's under-skipping + F002's `+` chunks burning
  beats) exhausting the 244-chunk stream several bars early — but
  verify rather than assume; the raw line itself should be checked
  against the full song text (is the ending "run run run..." section
  present in the raw line at all?). Also check whether the regenerated
  Creep `.lrc` (same dispatcher) is truncated/shifted the same way, and
  whether the other regenerated songs (Last Nite, Teenagers) share any
  of this — they should be ear-checked as part of the fix.
  [artifacts: pipeline]
