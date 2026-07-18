---
plan: plan-creep-dispatch-2026-07-18-8a7c.md
generated: 2026-07-18
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Diagnose the missing rule(s)

- [ ] T001 Research (no production code): explain why alphaTab 1.8.3's
  own lyric dispatch left the Creep vocal-track note at bar 16 tick
  60480 (voice 0, 1 note, not rest/isEmpty/grace — verified) with NO
  lyric while continuing to assign afterward — sequential
  `applyLyrics` (walks `beat.nextBeat`, skipping only
  `isEmpty || isRest`) seemingly cannot skip it without consuming a
  chunk. Read the shipped source in
  `node_modules/.pnpm/@coderline+alphatab@1.8.3/node_modules/@coderline/alphatab/dist/alphaTab.core.mjs`:
  `Track.applyLyrics` (~line 12686), `class Lyrics` chunker (~line
  11739), the GP7 importer's beat-level `Lyrics` handling
  (`_parseBeatLyrics` / `_skipApplyLyrics`, ~line 20735), and where the
  GP7 importer calls `applyLyrics` (~line 19471) — including whether
  `beat.isEmpty` differs at import time from after `score.finish()`,
  and whether Creep's empty per-beat `<Lyrics>` XML shells participate.
  File to study: `catalog/kinda-bad/radiohead-creep/Radiohead-Creep-06-25-2026.gp`
  (track 0 = lyrics track, `Content/score.gpif` in the zip). Write the
  findings (the rule, or "importer artifact, not a rule") as a note in
  this tasks file.
- [ ] T002 Research (no production code): determine complete dispatch
  semantics empirically by fitting rule sets against Creep end-to-end.
  Scripted (scratchpad, not committed): load the Creep score + raw line
  (`readRawLyricsLine`), chunk via `at.model.Lyrics.finish(false)`, and
  search the space of candidate rules — current two rules ± the T001
  rule ± `+`-hold variants (whitespace-only chunk consumes next
  singable beat vs. next any-kind beat, emitting nothing) — for the
  set that satisfies ALL acceptance checks: (a) Creep "cry" placed in
  bar 14 (~tick 51360); (b) Creep "You" of "You float" placed at tick
  59040 (mid-bar 16, the note after the rests); (c) the syllable
  stream reaches the raw line's final chunk before the last vocal note
  of the song (report where the final section lands — this resolves
  feedback F003: also diff the raw line's tail against the actual song
  ending to establish whether the source line is complete); (d) all
  three TIRO ground truths still pass (bar 14 "be", bar 69 "this?",
  bar 102 holds "ground"). Record the winning rule set and the F003
  verdict as a note in this tasks file. If no rule set satisfies all
  checks, stop and surface per the blocker rule.

## Phase 2: Implement

- [ ] T003 [artifacts: constitution, infrastructure] Test-first
  (Principle VII, red state): extend
  `packages/shared/src/lyrics-dispatch.test.ts` with (a) synthetic
  cases for each rule adopted in T002 — at minimum the
  whitespace-only-chunk hold (consumes a beat, emits no syllable,
  never appears in the output stream) and the T001/T002 missing-rule
  case; (b) real-file Creep ground truths (same `describe.skipIf`
  catalog-absence guard as the TIRO tests): "You" active exactly from
  tick 59040, not before; the last non-empty chunk of the raw line
  placed at/before the song's final vocal note (or, per T002's F003
  verdict, whatever end-of-stream expectation is correct). Confirm the
  new tests fail against the current dispatcher (use `it.fails`
  markers on the red commit per the pre-commit-hook convention).
- [ ] T004 [artifacts: infrastructure] Amend
  `packages/shared/src/lyrics-dispatch.ts` (and, only if T002's rule
  needs beat data beyond `{tickPosition, isRest, isTieDestination}`,
  extend the `DispatchBeat` projection and its two producers —
  `client/src/lyrics-beat-walk.ts#walkLyricBeatsFromRawLine` and the
  pipeline's `extractSyllablesFromRawLine` beat projection — keeping
  `dispatchLyrics` pure and alphaTab-free). Remove the `it.fails`
  markers from T003's tests; entire shared + pipeline + client suites
  green, TIRO tests untouched and passing.

## Phase 3: Regenerate, verify, close out

- [ ] T005 Re-run the pipeline for the four GP7/8 lyric songs
  (time-is-running-out, last-nite, teenagers, creep) so `meta.json` +
  `.lrc` regenerate from the amended dispatcher. Spot-check Creep's
  `.lrc`: a line containing "You float" starts at the time of tick
  59040, and the file's last lyric line matches T002's end-of-stream
  expectation. Supermassive/Lazy Eye untouched.
- [ ] T006 Live verification in a real browser (client + server):
  load Creep — click bar 16's first note (ticker must NOT yet show
  "You"; it appears only from the mid-bar note at tick 59040), scroll
  the song's end (lyrics present per T002's F003 verdict, no
  bars-of-empty-dividers dry-out at ~bar 84 unless the source line is
  genuinely incomplete), and sanity-play a verse. Re-verify one TIRO
  ground truth (bar 14 "be") as the regression check. Record outcomes
  in a tasks-file note, including a one-line ear-check guide for the
  user for Last Nite and Teenagers.
- [ ] T007 [artifacts: pipeline, infrastructure] Only if the adopted
  rule set changed the documented dispatch semantics: update
  pipeline.md's raw-line dispatch description and infrastructure.md's
  In-Tab Lyrics Overlay note to state the complete rule set (feedback
  F001/F002 artifact revisions); stamp `last_updated` via
  `ardd-state.sh stamp`. Skip with a note if the docs already describe
  the semantics at the right level of detail.
- [ ] T008 [parallel] Update the unfiled upstream alphaTab issue draft
  (`alphatab-issue-draft.md` in the coordinator's session scratchpad;
  if unreachable from the worktree, write a fresh copy alongside the
  tasks file note) to state the completed rule set from T002 and the
  tick-60480 finding from T001. Do NOT file it — filing awaits user
  confirmation. No repo code.
