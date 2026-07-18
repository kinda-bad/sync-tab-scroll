---
plan: plan-lyrics-dispatch-2026-07-18-8090.md
generated: 2026-07-18
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Shared dispatcher (F001 core)

- [x] T001 [artifacts: constitution, infrastructure] Create failing tests
  for a new shared GP-semantics lyric dispatcher in
  `packages/shared/src/lyrics-dispatch.test.ts` (Principle VII —
  test-first). Two groups: (a) synthetic fixtures covering each semantic
  rule in isolation — a non-empty chunk skips rest beats; a non-empty
  chunk skips tie-destination beats; an empty chunk consumes exactly one
  beat of any kind (note, rest, and tie-destination cases each); chunks
  exhausted before beats and vice versa terminate cleanly; (b) the real
  "TIRO" catalog file (`catalog/kinda-bad/muse-time-is-running-out/
  Muse-Time Is Running Out-06-16-2026.gp`, vocals trackIndex 1,
  lineIndex 0): dispatching its raw track-level lyric line (extract via
  zip+XML read of `Content/score.gpif`, the longest non-empty
  `<Lyrics dispatched="true"><Line><Text>` CDATA) must place "be" as the
  active syllable at bar 14 beat 1's tick, "this?" at bar 69 beat 1's
  tick, and leave bar 102 beat 1 with no syllable of its own (previous
  active syllable "ground" from bar 101), using the same
  last-syllable-with-tickPosition<=tick scan the overlay uses. Chunk the
  raw line with alphaTab's public `at.model.Lyrics` (`text` +
  `finish(false)`) — do not reimplement the chunker. Working reference
  logic for all of this exists in the session probe scripts
  `packages/pipeline/src/tiro-probe5.ts`/`tiro-probe7.ts`.
- [x] T002 [artifacts: infrastructure] Create
  `packages/shared/src/lyrics-dispatch.ts` exporting
  `dispatchLyrics(chunks: string[], beats: DispatchBeat[]): Syllable[]`
  where `DispatchBeat = { tickPosition: number; isRest: boolean;
  isTieDestination: boolean }` and `Syllable` is the existing
  `lyrics-walk.ts` type. Chunk-driven algorithm (verified this session):
  for each chunk in order — an empty chunk consumes exactly the next
  beat (any kind) with no output; a non-empty chunk advances past rest
  and tie-destination beats, lands on the next singable beat, and emits
  `{ text: chunk, tickPosition: beat.tickPosition }`. Pure function, no
  alphaTab import (platform-free like `walkSyllables`). Export from
  `packages/shared/src/index.ts`. Make T001's tests pass.
- [x] T003 Delete the five session probe scripts
  `packages/pipeline/src/tiro-probe.ts` through `tiro-probe7.ts`
  (whichever of tiro-probe.mjs/probe2..7 exist) once T001/T002 are green
  — their ground-truth checks now live in the test suite (constitution
  Principle II, No Dead Architecture).

## Phase 2: Pipeline raw-line publish + corrected .lrc

- [ ] T004 [artifacts: pipeline, datamodel] Test-first in
  `packages/pipeline`: extend the pipeline's existing raw `score.gpif`
  zip+XML read to extract the lyrics track's raw track-level lyric line
  (`<Lyrics dispatched="true"><Line><Text>` CDATA for the track at
  `lyricsTrackIndex`, plus that line's start-bar offset if non-zero) and
  publish it as a new `lyricsRawLine` field in the song's `meta.json`
  alongside `lyricsTrackIndex`/`lyricsLineIndex`/`lyricLineBreaks`.
  Songs with no track-level line (e.g. no lyrics, or true per-beat
  lyrics) omit the field.
- [ ] T005 [artifacts: pipeline] Test-first: switch the pipeline's
  syllable extraction for `.lrc` generation
  (`packages/pipeline/src/gp-parser.ts#extractSyllables` path) to use
  `dispatchLyrics` over the score's beats (chunked from the raw line via
  `at.model.Lyrics`) when a raw track-level line exists, instead of
  trusting alphaTab's `beat.lyrics`. Keep the current `walkSyllables`
  behavior as the fallback when no raw line is found. Assert on TIRO
  that the generated `.lrc` places "be"/"this?" lines at the corrected
  times.
- [ ] T006 Re-run the pipeline (`pnpm --filter pipeline extract-lyrics`
  flow) for the four lyric-bearing GP7/8 catalog songs
  (time-is-running-out, last-nite, teenagers, creep) so their
  `meta.json` gains `lyricsRawLine` and their `.lrc` files regenerate
  with corrected timing. Do NOT touch Supermassive Black Hole (GP5 —
  out of scope) or Lazy Eye (no lyrics). Spot-check the regenerated
  TIRO `.lrc` against the three ground truths.
- [ ] T007 [artifacts: pipeline, datamodel] Revise artifacts for the new
  field and semantics (feedback F001): pipeline.md — document the
  raw-line extraction/publish step and why dispatch is done with GP
  semantics rather than alphaTab's (`applyLyrics` divergence: ties not
  skipped, empty chunks burned only on playable beats); datamodel.md —
  add `CatalogSong.lyricsRawLine` (optional string) with its role.
  Stamp `last_updated` via ardd-state.sh; no code in this task.

## Phase 3: Client overlay switch-over

- [ ] T008 [artifacts: infrastructure, ui] Test-first (Playwright CT or
  vitest per module conventions): wire the client's overlay syllable
  derivation (`client/src/lyrics-beat-walk.ts` /
  `client/src/lyrics-overlay.ts` construction path) to use
  `dispatchLyrics` when the song's meta provides `lyricsRawLine` —
  chunk via `at.model.Lyrics`, project the rendered score's
  lyrics-track beats to `DispatchBeat[]` (tick =
  `beat.absolutePlaybackStart`, same tick source as `walkSyllables`) —
  falling back to the existing `walkSyllables(score, source)` when the
  field is absent (legacy/personal catalog songs). The server/catalog
  loader must pass `lyricsRawLine` through to the client with the other
  lyrics pointer fields.
- [ ] T009 [artifacts: infrastructure] Revise infrastructure.md's In-Tab
  Lyrics Overlay section (feedback F001): the syllable stream now comes
  from the shared GP-semantics dispatcher fed by the published raw
  line, with `beat.lyrics`/`walkSyllables` as the legacy fallback;
  note the alphaTab `applyLyrics` divergence as the reason. Stamp
  `last_updated`; no code in this task.
- [ ] T010 Live verification in the running app (client + server, real
  browser): load TIRO, click the first note of bar 14 (expect "be"),
  bar 69 (expect "this?"), and bar 102 (expect held "-ground", with
  "you" only later in the bar). Also sanity-play a verse to confirm the
  ticker tracks the singing. Record the outcome in the task note.

## Phase 4: correctDrift pause fix (F002)

- [ ] T011 [artifacts: infrastructure] Reshape the uncommitted
  working-tree fix in `client/src/playback-sync.ts#correctDrift`
  (feedback F002): instead of `if (playbackState.status !== 'running')
  return null;` before the extrapolation block, extrapolate only while
  `status === 'running'` and otherwise drift-correct against the raw
  `playbackState.tickPosition` (elapsedTicks = 0), so a host
  seek-while-paused still propagates to non-hosts while the
  phantom-forward-extrapolation bug stays fixed. Test-first: keep the
  existing new regression test ("does not extrapolate a phantom tick
  forward for a non-host once paused"), and add a
  seek-while-paused-propagation test (non-host paused at tick 300,
  playbackState arrives with status 'paused', tickPosition 5000 →
  tickPosition corrected to 5000). Run the full playback-sync suite.

## Phase 5: Close-out

- [ ] T012 Close out the superseded tie-boundary effort: flip
  `.project/tasks/tasks-99e6-e76f.md` to `abandoned` via
  `.claude/skills/ardd-scripts/ardd-state.sh tasks-flip` (its plan
  `plan-99e6-2026-07-18-6d2b.md` is already `superseded`), and append a
  short resolution note pointing at
  `feedback-lyrics-dispatch-root-cause-f0f6.md` and this plan: the bug
  was upstream of both candidate sites, in alphaTab's score-load lyric
  dispatch. No code.
- [ ] T013 [parallel] Draft and file an upstream alphaTab GitHub issue
  (coderline/alphaTab) describing the `applyLyrics` divergence from
  Guitar Pro dispatch semantics (ties not skipped; empty chunks burned
  only on playable beats), with the TIRO-derived minimal repro. If
  maintainer appetite exists, note our shared dispatcher as a candidate
  patch. Record the issue URL in the task note. No repo code.
