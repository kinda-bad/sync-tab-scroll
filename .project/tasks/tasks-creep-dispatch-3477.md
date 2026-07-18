---
plan: plan-creep-dispatch-2026-07-18-8a7c.md
generated: 2026-07-18
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Diagnose the missing rule(s)

- [x] T001 Research (no production code): explain why alphaTab 1.8.3's
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
- [x] T002 Research (no production code): determine complete dispatch
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

> **T001 findings (2026-07-18):** Importer artifact, not a rule — and a
> bigger one than expected. In alphaTab 1.8.3's GPIF importer
> (`alphaTab.core.mjs`), any per-beat `<Lyrics>` element sets
> `this._skipApplyLyrics = true` (line ~20735, `case "Lyrics": beat.lyrics =
> this._parseBeatLyrics(c); this._skipApplyLyrics = true;`), and the
> importer's entry point (line ~19471) then **never calls
> `Track.applyLyrics` at all**. Creep's `Content/score.gpif` carries 246
> per-beat `<Lyrics><Line><![CDATA[...]]></Line>` blocks on the lyrics
> track, so every lyric alphaTab displays for Creep is read verbatim from
> the file — Guitar Pro's own (hand-editable) per-beat placement — with
> zero sequential dispatch. The "mysterious" bar-16 note at tick 60480 has
> no lyric simply because its `<Beat id="52">` has no `<Lyrics>` child in
> the XML; nothing "skipped" it at runtime. It is a plain note (fret 4,
> string 3, no tie/grace/slur/chord — verified in the model), so no
> beat-property rule can reproduce that hole: it is GP-author hand
> placement (or a post-dispatch note edit) baked into the file.
> Consequence: for GP7/8 files with per-beat lyrics, the file's own
> per-beat data is the display-authoritative stream, and no raw-line rule
> set is guaranteed to reproduce it.

> **T002 findings — BLOCKED (2026-07-18):** Exhaustive fit of the candidate
> space (skipTies x skipGrace x whitespace-chunk mode: emit /
> hold-next-singable / hold-next-any = 12 rule sets, scripted in scratchpad
> `fit-rules.mjs` against alphaTab chunker + real beats) — **no rule set
> satisfies all acceptance checks**, and check (b) is provably
> unsatisfiable by ANY beat-property rule:
>
> - Creep's own authoritative per-beat file data places `cry`@51360 (bar
>   14), then `You`@51840, `float`@52320, `like`@52800, `a`@53280,
>   `fea-`@53760(tie-dest!), rests, then `the-`@59040, `e-`@59520,
>   `er`@60000, (hole)@60480, `In`@60960. So **tick 59040 carries "the-",
>   not "You"** per the file; ground truth (b) "You"@59040 contradicts the
>   file. And (a)+(b) jointly are impossible for sequential dispatch: to
>   put "You" at 59040 after "cry"@51360, chunks You/float/like/a would
>   have to skip four plain singable note beats (51840–53280) that no
>   beat property distinguishes.
> - Best-fit vs Creep's 246-entry per-beat truth: skip-rests-only (ties
>   KEPT, graces kept, ws emit) — i.e. essentially alphaTab's applyLyrics
>   rule — matches perfectly up to the 60480 hand-placed hole, then runs
>   one beat early forever (45/246 exact-tick matches). The shipped
>   ties-skipped rule scores 7/246 on Creep.
> - But TIRO demands the OPPOSITE: its user-validated truths (bar 14
>   "be", bar 69 "this?", bar 102 "ground") hold ONLY with ties skipped;
>   with ties kept TIRO gives death/yeah,/it. And TIRO's own per-beat
>   file data (333 entries) says bar 14 = "death" — i.e. TIRO's per-beat
>   data is stale/divergent from the user's ear while Creep's is locally
>   consistent. The two songs' ground truths select mutually exclusive
>   rule sets.
> - **F003 verdict:** the Creep raw line IS complete — it ends "...She
>   run, run, run / Whatever makes you happy ... / I don't be-long here /
>   I don't be-long here". Both the raw line and the file's per-beat
>   lyrics end at bar 72 (`here`@275040); the lyric-track notes in bars
>   73–89 genuinely carry no lyrics in the source. Correct end-of-stream
>   is bar 72; any rendering past that is dispatcher misalignment, and a
>   "dry-out" after bar 72 is source-accurate, not a defect.
> - **Recommendation for the next plan:** stop fitting raw-line rules for
>   per-beat-authored files. When the GPIF carries per-beat `<Lyrics>`
>   (alphaTab exposes them as `beat.lyrics`), use that stream directly as
>   the syllable source (it is what GP shows and what the author placed);
>   keep raw-line dispatch (current ties-skip rules, TIRO-validated) only
>   as the fallback for files without per-beat data. The user's Creep
>   "You"@59040 expectation should be re-checked against the file's
>   "the-"@59040 placement — no dispatcher can produce it from this file.
>
> Per the blocker rule, T003–T008 were not started.

> **T002 resumption (2026-07-18, revised measure-level anchors) — STILL
> BLOCKED, but much closer.** Re-ran the fit with the user's 8 new
> anchors (b18 "In a beautiful world", b19 empty, b20 "I wish I was
> special", b61 "She's", b62 "ru-un-ning out", b63 "She run, run,",
> b88 "I don't belong", b89 "here") plus b14 "cry", "You" not before
> b16, and the three TIRO truths — 13 checks total. Searched
> exhaustively: skip-class powerset over {tie-dest, grace, hp-dest,
> hp-origin, tie-origin, vibrato, hp+vib compound, slide-out shift (s1),
> slide-out legato (s2), slide-destination (sd1/sd2), dotted,
> long-note} x 4 whitespace-chunk semantics (emit / hold-next-singable /
> hold-next-any-beat / consume-nothing) — ~16k combinations. **No rule
> set passes 13/13.** Principled maximum is 10/13; the
> only 11/13 sets are 5-class overfits (e.g. tie+hpvib+s1+s2+sd1,
> hold-any) with WORSE residual shape (b61 late, b63 three bars late).
>
> **Best rule set: skip rests + tie destinations + grace beats +
> shift-slide-out beats (slideOutType 1); whitespace `+` chunks consume
> one singable beat, emit nothing** — 10/13:
> - PASS: b14 cry@bar14; You first lands bar 16 (tick 59040!); b18 all
>   six syllables in bar 18; b19 empty; b20 (phrase opens bar 20 —
>   note: bar 20 has only 5 singable beats for 6 syllables under EVERY
>   rule set, so "cial" lands the bar-21 downbeat; strict all-in-20 is
>   physically impossible); b88 "I don't belong" in bar 88; b89 "here"
>   at bar 89 (tick 338400, the final vocal note); all three TIRO
>   truths (be / this? / ground).
> - RESIDUALS (per-anchor): She's@bar60 tick 226560 (wanted 61/230400),
>   ru-@61/230400 (wanted 62/234240), She@62/235680 (wanted 63/238080)
>   — exactly one singable beat early, all three; un-/ning/out and
>   run,/run, already land in their stated bars.
> - **Why it can't close:** the trio needs exactly +1 extra skipped
>   beat somewhere in bars 21–60, but the final line needs NET ZERO
>   extra skips by bar 88 (verified: forcing any one extra skip fixes
>   b61/62/63 completely and then pushes the final "here" off the end
>   of the beat stream — bar 88–89 has exactly the 5 singable slots the
>   last line needs). Monotone skip rules cannot add a skip and later
>   take it back; the ws-chunk nonlinearity (hold-any) can, but no
>   class assignment balances both regions (exhaustively checked).
> - Diagnostics: the file's own per-beat lyrics are useless as
>   arbiter here — in bars 57–64 they carry "...you want / You're so
>   fuckin' special / I wish I was special / But I'm a creep" where the
>   user hears "She's running out / She run, run," (a full section
>   offset; they end at bar 72 vs the true bar-89 ending). The
>   one-beat residual most likely reflects a missing melisma note in
>   the transcription of the "do-o-o-o-o-or" run (bars 58–60), not a
>   missing dispatch rule.
> - For comparison, the SHIPPED rule set scores 5/13 on the same
>   checks; the best set fixes both user-reported defects (the "In a
>   beautiful world" placement and the end-of-song dry-out) and leaves
>   only the 3-syllable/one-beat residual at bars 60–62.
>
> Stopping again per instruction ("if none fits, report the best
> per-anchor residuals and stop"). Recommended next decision for the
> user/coordinator: accept the best rule set above (rests + tie-dest +
> grace + shift-slide skip) as the dispatch semantics — it is minimal,
> musically motivated (all four classes are non-attack/ornament beats),
> and TIRO-safe — and treat the bars-60-62 residual as transcription
> error; then T003–T008 can proceed against it.

> **Decision (2026-07-18, coordinator/user): recommendation accepted.**
> Adopted dispatch semantics: a non-empty chunk skips rests, tie
> destinations, grace beats, and shift-slide-out beats, landing on the
> next singable beat; a whitespace-only `+` chunk consumes one singable
> beat (same skipping) and emits nothing; an empty chunk consumes any
> one beat. The bars-60–62 one-singable-beat residual is recorded as a
> TRANSCRIPTION DEFECT in the source tab (missing melisma note in the
> bars-58–60 "do-o-o-o-or" run) — T006's live check must treat
> "She's / ru-un-ning / She run" landing one bar early around bars
> 60–62 as the expected observable, not a failure.

## Phase 2: Implement

- [x] T003 [artifacts: constitution, infrastructure] Test-first
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
- [x] T004 [artifacts: infrastructure] Amend
  `packages/shared/src/lyrics-dispatch.ts` (and, only if T002's rule
  needs beat data beyond `{tickPosition, isRest, isTieDestination}`,
  extend the `DispatchBeat` projection and its two producers —
  `client/src/lyrics-beat-walk.ts#walkLyricBeatsFromRawLine` and the
  pipeline's `extractSyllablesFromRawLine` beat projection — keeping
  `dispatchLyrics` pure and alphaTab-free). Remove the `it.fails`
  markers from T003's tests; entire shared + pipeline + client suites
  green, TIRO tests untouched and passing.

## Phase 3: Regenerate, verify, close out

- [x] T005 Re-run the pipeline for the four GP7/8 lyric songs
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
