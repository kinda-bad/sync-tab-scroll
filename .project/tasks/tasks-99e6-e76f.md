---
plan: plan-99e6-2026-07-18-6d2b.md
generated: 2026-07-18
status: in-progress
---

# Tasks

## Phase 1: Diagnose

- [x] T001 [artifacts: ui] Add a test case to `packages/shared/src/lyrics-walk.test.ts` reproducing the tie-across-barline scenario: construct a fixture with a beat carrying a tie-destination note and no lyric text (the "breath" beat, mirroring measure 8's last note of "TIRO"), immediately followed by a beat that carries the next lyric ("You're"-equivalent, mirroring measure 9's first note). Assert on the resulting `Syllable.tickPosition` for that next syllable equals the expected beat's own `absolutePlaybackStart`, not an earlier tick. This either confirms or rules out a walk/dedup misattribution as the root cause. Addresses `feedback-lyrics-ticker-tiro-measure8-9310.md` F001. Run `pnpm --filter @sync-tab-scroll/shared test` and record whether the new test passes or fails against current code.
- [x] T002 [artifacts: ui] If T001's new test passes against current code (i.e. `walkSyllables` already produces the correct tick for this scenario), trace `client/src/lyrics-overlay.ts`'s `updateActiveSyllable` function and the `playerPositionChanged` handler that drives it to find where the early highlight actually originates (e.g. stale index caching, an off-by-one in the `tickPosition <= tickPosition` comparison around line 145, or a lookahead introduced by an earlier lyrics-timing pass). Document findings as a short comment at the eventual fix site in T003 rather than a separate research file. If T001's test instead failed (confirming the walk/dedup root cause), this task is a no-op — skip it and proceed to T003 with T001's findings.

## Phase 2: Fix — BLOCKED, see note

**BLOCKER (found during T001/T002, before starting T003):** Phase 1's
diagnosis found no code-level bug in either candidate site. T001's
synthetic tie-across-barline fixture (`packages/shared/src/
lyrics-walk.test.ts`) already passes against current code — `walkSyllables`
gives the post-tie syllable its own, correct `tickPosition`. T002's trace
of `client/src/lyrics-overlay.ts#updateActiveSyllable` found the
`tickPosition <= tickPosition` scan structurally correct (no off-by-one,
no stale `activeIndex` caching, no lookahead) — documented inline at the
function (T002's required comment). Additionally replayed both checks
against the actual catalog "TIRO" file (`catalog/kinda-bad/
muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp`,
`lyricsTrackIndex: 1`, `lyricsLineIndex: 0`): the real note/tie/lyric data
around measure 8/9 doesn't match the feedback's literal description
either — the vocals track's bar 8 last beat ("You're", tick 29760) is not
a tie destination and carries its own onset; simulating
`updateActiveSyllable`'s exact scan across ticks 26880-31200 against the
real `walkSyllables` output never returns "You're" before tick 29760. (The
bass track does have an unrelated tie-destination note landing at the same
tick 29760, coincidentally, but that's a different track/staff than the
lyrics source and not read by the walk.)

Neither of the plan's two declared candidate root causes reproduces
against current code + the current catalog file, so T003 cannot proceed as
written ("implement the fix at whichever site T001/T002 identified" — no
site was identified). Stopping here per instructions rather than
fabricating a fix. Two possibilities worth a fresh
`/ardd-research` or `/ardd-feedback` pass rather than guessing in this
plan: (a) the catalog `.gp` file was edited since the original feedback
was filed and no longer contains the exact described tie/breath note, or
(b) the real mechanism is upstream of both candidate sites — e.g.
alphaTab's own `playerPositionChanged` tick reporting vs. its animated
cursor rendering, or `client/src/playback-sync.ts`'s
`latency-compensated-position-extrapolation` (shipped just before this
plan; forwards `api.tickPosition` for non-host session participants),
neither of which this plan's Scope covers.

- [ ] T003 [artifacts: ui] Implement the fix at whichever site T001/T002 identified as the root cause — either `packages/shared/src/lyrics-walk.ts` (`walkSyllables`'s tie/dedup logic) or `client/src/lyrics-overlay.ts` (`updateActiveSyllable`'s tick comparison). Addresses `feedback-lyrics-ticker-tiro-measure8-9310.md` F001. Also check whether `packages/pipeline/src/gp-parser.ts#extractSyllables` (which reuses the same shared `walkSyllables`) is affected — if the fix changes shared walk output, note in the task result whether previously-generated `.lrc` files need regenerating.
- [ ] T004 Confirm or add a regression test at the fix site encoding the measure-8/9 tie-boundary scenario, so a future change can't silently reintroduce the early highlight. If T001 already added a test in `packages/shared/src/lyrics-walk.test.ts` that now correctly passes post-fix, this task finalizes it (no duplicate); if the fix instead landed client-side, add an equivalent regression test in `client/src/lyrics-overlay.ct.spec.ts` (the existing Playwright CT suite for this file) covering the same tie-boundary timing case. Run the full relevant suite (`pnpm --filter @sync-tab-scroll/shared test` and/or `pnpm --filter client test:ct` as applicable) to confirm green.

## Phase 3: Close out audio-latency feedback [parallel]

- [ ] T005 No implementation task required — `feedback-audio-output-latency-t014-dfa8.md` F001 was already marked incorporated and flipped to `status: planned` (bound to this plan) during `/ardd-plan`'s feedback bookkeeping. When Phase 2 lands, note in the final commit/PR description that this plan's fix addresses the reported "~2 syllables ahead" symptom via a non-latency root cause, so the Bluetooth-output-latency hypothesis in that feedback file is superseded rather than pursued further. If the symptom persists post-fix, file fresh feedback rather than reopening this item.
