---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: creep-dispatch
created: 2026-07-18
features: []
surfaced-defects: []
---

# Plan: Complete the GP lyric-dispatch semantics (Creep-class files)

## Goal

Make the shared lyric dispatcher handle Creep-class files correctly —
find and implement the missing beat-skip rule, treat GP `+` hold markers
as holds, and ensure the syllable stream spans the whole song — verified
against the user's Creep ground truths without regressing TIRO.

## Scope

**In** (all from `feedback-creep-lyrics-misalignment-0911.md`):
- F001: root-cause the remaining ~1-singable-beat drift ("You" of "You
  float" lands on bar 14's last note, tick 53280, instead of mid-bar 16,
  tick 59040). The strongest lead: alphaTab's own dispatch skipped the
  real, singable, non-rest/non-empty/non-grace note at bar 16 tick 60480
  without consuming a chunk — identify that rule in alphaTab's importer/
  `applyLyrics` path and add it to `dispatchLyrics`' beat projection.
- F002: handle `+` hold markers — alphaTab's chunker turns a standalone
  `+` into a `" "` (single-space) chunk; the dispatcher must treat
  whitespace-only chunks as holds (consume a beat, emit no syllable)
  instead of emitting blank syllables that pollute the ticker and
  `lyricLineBreaks` grouping.
- F003: the ticker running dry after ~bar 84 — verify whether it's purely
  cumulative misconsumption from F001/F002 or the raw line genuinely
  lacks the song's ending; fix accordingly (if the line is complete, the
  F001/F002 fixes should close this — prove it).
- Regenerate and re-verify all four GP7/8 catalog songs' meta/`.lrc`;
  keep the three TIRO ground truths green (regression gate); add Creep
  ground truths (bar 16 "You" mid-measure entry; lyrics present to the
  song's end) to the shared test suite.
- Update the unfiled upstream alphaTab issue draft with whatever rule
  F001 uncovers (still not filed without user OK).

**Out:**
- GP5/Supermassive (`gp5-raw-lyric-line-extraction`, backlogged).
- The song-switch stale-score bug (`feedback-song-switch-stale-score-
  e030.md`, separate open feedback — not consumed by this plan).
- Filing the upstream issue (user decision, post-fix).

## Technical Approach

This is a diagnosis-led follow-up to `plan-lyrics-dispatch-2026-07-18-
8090.md`: the shipped dispatcher implements two verified rules (non-empty
chunks skip rests + tie destinations; empty chunks consume any beat) that
fully explain TIRO but not Creep. Creep demonstrates at least one more
rule. Phase 1 pins it down empirically before any dispatcher change:
read alphaTab 1.8.3's GP7 importer + `Lyrics`/`applyLyrics` source
(node_modules `alphaTab.core.mjs`) to explain the tick-60480 no-chunk
skip, and brute-force-fit candidate rule sets against Creep's full
beat/chunk data with the user's ground truths as acceptance checks
(mid-bar-16 "You"; stream reaching the final section). Only then does
Phase 2 amend `packages/shared/src/lyrics-dispatch.ts` (and, if the rule
needs more beat information, the `DispatchBeat` projection in the client
walk and pipeline — keeping the function pure/platform-free per the prior
plan's design).

F002 is independent of the unknown rule: whitespace-only chunks become
holds (consume one singable beat, emit nothing). Whether a hold skips
rests/ties like a syllable or consumes any beat like an empty chunk is a
Phase-1 empirical question (Creep's `+ +` runs decide it).

All consumers pick the fix up for free: client overlay and pipeline
`.lrc` both call the shared dispatcher; Phase 3 regenerates catalog
output and live-verifies.

## Phase Breakdown

**Phase 1 — Diagnose the missing rule(s).** No dependencies. Research
tasks, no production code: explain alphaTab's tick-60480 skip from its
source; determine `+`-hold consumption semantics; fit a complete rule
set against Creep end-to-end (scripted, using the real catalog file and
the user's ground truths); document findings in the tasks file.

**Phase 2 — Implement.** Depends on 1. Test-first (Principle VII):
extend the shared test suite with Creep ground-truth + synthetic cases
for each new rule (including whitespace-only-chunk holds), then amend
`dispatchLyrics` (and `DispatchBeat` projection + its two call sites if
the new rule needs more beat data). TIRO tests must stay green
untouched.

**Phase 3 — Regenerate, verify, close out.** Depends on 2. Re-run the
pipeline for the four GP7/8 songs; live-verify Creep in the browser
(bar 16 "You" entry, lyrics to the end, spot-check verse alignment) and
re-verify one TIRO ground truth; ear-check guidance for Last Nite/
Teenagers recorded for the user; update the alphaTab issue draft with
the completed rule set; artifact touch-ups only if the documented
dispatch semantics in pipeline.md/infrastructure.md need the new rule
added (revision tasks, feedback F001/F002).

## Open Questions

1. If Phase 1 cannot explain the tick-60480 skip from alphaTab's source
   (e.g. it's an importer-state artifact rather than a dispatch rule),
   the fallback is empirical: adopt whatever minimal rule set makes
   Creep AND TIRO ground truths pass. Acceptable?
2. If F003's dry-out turns out to be a genuinely incomplete raw lyric
   line in the source file (tab-quality issue), the ticker will
   correctly show nothing for the ending — accept as data limitation
   (consistent with the prior plan's Open Question 3)?
3. Whether `+` holds should also advance past rests/ties (like
   syllables) or consume any beat (like empty chunks) — decided
   empirically in Phase 1 by Creep's `+ +` runs.
