---
status: planned
created: 2026-07-18
plan: plan-lyrics-dispatch-2026-07-18-8090.md
---

# Feedback

Context: live static repro on "TIRO" (Muse — Time Is Running Out, catalog
`kinda-bad/muse-time-is-running-out`), host, local, no playback — click a
note, ticker highlights the wrong word. Three user-supplied ground truths:
bar 14 beat 1 should highlight "be" (showed "death"), bar 69 beat 1 should
highlight "this?" (showed second "ooh,"), bar 102 beat 1 should hold
"-ground" with "you" later in the bar (showed "can't"). Root-caused this
session with a prototype dispatcher that reproduces all three exactly.

## Bugs

- [x] F001 Lyrics are misaligned onto beats at score-load time for every
  catalog song storing lyrics as a track-level line (all 4 lyric-bearing
  GP7/8 files + the legacy GP5 Supermassive Black Hole; Lazy Eye has no
  lyrics and is unaffected). alphaTab's `Track.applyLyrics` dispatch
  diverges from Guitar Pro semantics in two ways: (1) non-empty syllables
  must skip tie-destination beats in addition to rests (alphaTab only
  skips rests, so every tied vocal note eats a syllable early); (2) an
  empty chunk (from multi-space runs in the raw line, used by tab authors
  as beat-skips) must consume exactly one beat of any kind — note, rest,
  or tie (alphaTab burns them only on playable beats). Both errors
  accumulate through the song in opposite directions, so the observed
  offset varies by location and sign. Chunking itself (alphaTab's
  `Lyrics` parser: space/dash splitting, `[..]` comments, empty chunks
  from space runs) is correct and reusable. Verified fix semantics: a
  chunk-driven dispatcher (empty chunk → consume next beat of any kind;
  non-empty → skip rests+tie-destinations, land on next singable beat)
  reproduces all three TIRO ground truths. Preferred fix site: pipeline
  at ingest (read the raw line from `score.gpif` / GP5 binary, dispatch
  correctly, feed the corrected per-beat placement to both the live
  ticker path and `.lrc` generation) so the client stays alphaTab-only.
  Downstream consumers `walkSyllables`, `lyrics-overlay.ts`, and
  `correctDrift` were each investigated and are faithful to their input —
  no changes needed there for this bug. Cleanup: delete/condense the five
  session probe scripts `packages/pipeline/src/tiro-probe*.ts` when
  implementing. [artifacts: pipeline, infrastructure]

- [x] F002 Separate latent bug (found while chasing F001, uncommitted fix
  already in working tree): `correctDrift` in `client/src/playback-sync.ts`
  — the pause-transition branch doesn't return, so for non-host
  participants the latency extrapolation keeps running while paused;
  `serverTimestamp` freezes but `Date.now()` advances, so `tickPosition`
  is repeatedly forced forward past the real paused position on every
  store update. Working-tree fix guards extrapolation on
  `status === 'running'` (plus a regression test; suite passes), but as
  written it likely breaks seek-while-paused propagation to non-hosts —
  preferred shape: while not running, drift-correct against the raw
  `playbackState.tickPosition` with zero extrapolation instead of
  returning early. Needs a decision + verification before commit.
  [artifacts: infrastructure]
