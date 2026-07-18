---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: lyrics-dispatch
created: 2026-07-18
features: []
surfaced-defects: []
---

# Plan: Correct GP lyric dispatch (lyrics ticker desync root fix)

## Goal

Make the lyrics ticker (and `.lrc` generation) highlight the correct
syllable at every tick by replacing alphaTab's divergent track-level lyric
dispatch with a shared GP-semantics dispatcher, and land the separate
`correctDrift` paused-extrapolation fix.

## Scope

**In:**
- F001 (`feedback-lyrics-dispatch-root-cause-f0f6.md`): a shared
  chunk-driven dispatcher implementing verified GP semantics — non-empty
  syllables skip rest **and tie-destination** beats; an empty chunk
  (multi-space beat-skip) consumes exactly one beat of any kind. Verified
  this session to reproduce all three TIRO ground truths (bar 14 "be",
  bar 69 "this?", bar 102 gap after "underground").
- Pipeline: read the raw track-level lyric line from `score.gpif` (the
  pipeline already does a raw zip+XML read for line breaks — pipeline.md
  Dependencies), publish it for the client, and use the corrected
  dispatch for `.lrc` generation. Regenerate affected catalog outputs.
- Client: derive the in-tab overlay's syllable stream via the shared
  dispatcher instead of trusting `beat.lyrics`, falling back to the
  current `walkSyllables` behavior when no raw line is published.
- F002: `correctDrift` paused-extrapolation fix (working tree), reshaped
  so non-hosts still follow a host seek-while-paused: while
  `status !== 'running'`, drift-correct against the raw
  `playbackState.tickPosition` with zero extrapolation instead of
  returning early.
- Close out `tasks-99e6-e76f.md` (blocked at T003) — its mystery is
  resolved: the bug was upstream of both of its candidate sites, at
  score-load dispatch time. This plan supersedes `plan-99e6-2026-07-18-6d2b.md`.
- Delete the session probe scripts `packages/pipeline/src/tiro-probe*.ts`
  (condensing their ground-truth checks into real tests).

**Out:**
- Supermassive Black Hole (legacy GP3–5 binary): its raw lyric line needs
  a GP5 binary reader, a different mechanism from the gpif XML read.
  Deferred to a follow-up unless trivially reachable (Open Question 2).
- Upstream alphaTab fix/issue for the dispatch divergence (worth filing,
  but not gating).
- Audio output-latency compensation (still out, per plan-99e6's close-out
  reasoning — re-evaluate only if symptoms persist after this fix).

## Technical Approach

Root cause (feedback F001): GP7/8 catalog files store lyrics as one raw
track-level text line; alphaTab's `Track.applyLyrics` dispatches it onto
beats skipping only rests, and burns empty chunks only on playable beats.
Guitar Pro's semantics differ on both counts, so every tied vocal note and
every authored multi-space skip shifts all following syllables — a
cumulative, sign-varying misalignment baked into `beat.lyrics` at score
load, upstream of everything the 99e6 plan investigated.

Fix architecture (three layers, all consuming one new shared function):

1. **`packages/shared/src/lyrics-dispatch.ts`** — `dispatchLyrics(chunks,
   beats)` where `beats` is a minimal ordered projection (`{tick, isRest,
   isTieDestination}`). Chunking itself reuses alphaTab's public
   `at.model.Lyrics` parser (`finish(false)` — space/dash splitting,
   `[..]` comments, empty chunks preserved), which is already correct.
   The dispatcher is pure and platform-free so client and pipeline share
   it verbatim (constitution Principle I spirit; same sharing rationale
   as `walkSyllables` — infrastructure.md In-Tab Lyrics Overlay).
2. **Pipeline** — extract the raw `<Lyrics dispatched="true"><Line><Text>`
   for the lyrics track (plus its `startBar` offset) during the existing
   `score.gpif` raw read; publish it in `meta.json` (new
   `CatalogSong.lyricsRawLine` field — datamodel.md addition). `.lrc`
   generation (`extractSyllables`) switches to the corrected dispatch.
   This preserves pipeline.md's "no precomputed tick map" decision: only
   text/skip structure is published; the client still derives all tick
   positions live from the parsed score.
3. **Client** — the overlay's syllable walk uses `dispatchLyrics` over the
   rendered score's beats when `lyricsRawLine` is present; otherwise it
   falls back to today's `beat.lyrics`-trusting `walkSyllables` (legacy /
   personal-catalog songs without regenerated meta).

F002 is independent (client-only, `client/src/playback-sync.ts`): keep the
working-tree regression test, but replace the hard
`if (status !== 'running') return null` guard with "extrapolate only while
running; otherwise compare against raw `playbackState.tickPosition`" so a
host seek-while-paused still propagates to non-hosts. Add a test for that
propagation case.

## Phase Breakdown

**Phase 1 — Shared dispatcher (F001 core).** No dependencies.
- Test-first: port the three TIRO ground truths plus synthetic
  tie/empty-chunk cases into `packages/shared` tests; implement
  `dispatchLyrics`. Delete `tiro-probe*.ts` once their checks live in
  tests.

**Phase 2 — Pipeline raw-line publish + corrected `.lrc`.** Depends on 1.
- Extract/publish `lyricsRawLine` (+ start bar) in `meta.json`;
  regenerate meta + `.lrc` for the 4 affected GP7/8 catalog songs;
  artifact revisions: pipeline.md, datamodel.md (`[artifacts: pipeline,
  datamodel]`, feedback F001).

**Phase 3 — Client overlay switch-over.** Depends on 1 and 2.
- Wire the dispatcher into the overlay walk with the legacy fallback;
  artifact revision: infrastructure.md In-Tab Lyrics Overlay
  (`[artifacts: infrastructure]`). Live-verify the three TIRO ground
  truths in the running app.

**Phase 4 — `correctDrift` pause fix (F002).** Independent of 1–3.
- Reshape the guard to raw-comparison-while-paused; keep + extend tests
  (phantom-advance regression, seek-while-paused propagation)
  (`[artifacts: infrastructure]`, feedback F002).

**Phase 5 — Close-out.** Depends on 1–4.
- Mark `tasks-99e6-e76f.md` resolution (superseded by this plan), file the
  optional upstream alphaTab issue, doc notes.

## Open Questions

1. **Publish shape**: raw line verbatim (client re-chunks via alphaTab's
   parser) vs. pre-chunked array in `meta.json`. Leaning raw line —
   smaller surface, chunker already shared via alphaTab.
2. **Supermassive (GP5)**: attempt a minimal GP5 lyric-line read in Phase 2
   (the GP5 lyrics block is a simple documented structure) or defer to a
   backlogged follow-up? Default: defer unless it falls out trivially.
3. **Songs whose authored line is itself misaligned**: the dispatcher can
   only be as correct as the source text. If a regenerated song still
   reads wrong against the audio, that's a data (tab-quality) issue —
   accept as out of scope?
4. **F002 verification**: unit tests cover both directions, but should the
   seek-while-paused path also get a live two-client check before commit?
