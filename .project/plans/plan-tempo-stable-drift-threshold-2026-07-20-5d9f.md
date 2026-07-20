---
status: approved
branch: tempo-stable-drift-threshold
created: 2026-07-20
features: []
surfaced-defects: []
---

# Plan: Tempo-Stable Drift Threshold

Consumes `feedback-recording-drift-replan-4e1c.md` **F001** — the last
open item in that file. Independent of
`plan-recording-drift-foundation-2026-07-20-9ca3.md`: this is a latent
bug in the *shipped synth path* that the recording work merely exposed,
and it ships on its own.

## Goal

Express playback drift correction's tolerance in milliseconds rather than
MIDI ticks, so the same real-world sync tolerance applies at every tempo
instead of silently tightening as tempo rises.

## Scope

**In scope**

- Replace `DRIFT_THRESHOLD_TICKS = 50` in `client/src/playback-sync.ts`
  with a millisecond constant, converting the measured drift at the local
  tempo before comparison.
- Applies to **all playback paths** — synth today, backing-track later.
  Not a recording-only special case.
- Unit coverage that the tolerance is genuinely tempo-invariant.

**Out of scope**

- Anything in `plan-recording-drift-foundation-2026-07-20-9ca3.md`. The
  two plans touch the same function, so see Technical Approach for the
  ordering note, but no recording behavior is in scope here.
- Changing the correction *mechanism* — this changes the units of the
  comparison, not what happens when it trips.
- Retuning the ~1s host tick-report cadence.

## Technical Approach

`correctDrift` currently compares a tick-domain drift against a fixed
50-tick threshold. Because a tick is a fraction of a beat, that fixed
count means a different real tolerance at every tempo — and a *stricter*
one as tempo rises, which is backwards: `3125 / bpm` milliseconds.

The fix is small and local. `correctDrift` already computes
`localTempoAtTick(api.score, playbackState.tickPosition)` for its
extrapolation, and `ticksToMs(ticks, bpm)` already exists in
`tempo-lookup.ts`. So the drift comparison converts at the tempo already
in hand — a conversion, not new machinery, and no new module.

**Choice of constant: 35ms**, measured against the real catalogue rather
than assumed. Every song currently in the catalogue sits between 93 and
130 bpm, and none carries a mid-song tempo change:

| Song | bpm | Today's effective tolerance |
|---|---|---|
| Radiohead — Creep | 93 | 33.6ms |
| The Strokes — Last Nite | 104 | 30.1ms |
| My Chemical Romance — Teenagers | 112 | 27.9ms |
| Muse — Time Is Running Out | 118 | 26.5ms |
| Muse — Supermassive Black Hole | 120 | 26.0ms |
| Silversun Pickups — Lazy Eye | 130 | 24.0ms |

35ms sits just above the strictest of those (33.6ms), so **no song gets
more corrections than it does today** — the change is
loosening-or-neutral everywhere, with no regression surface — while
leaving 15ms of headroom under the 50ms perceptual bar set in
`research-recording-mode-drift-2026-07-19-b7c2.md` (T004b).

Worth recording honestly: at real catalogue tempos the present behavior
is **not** broken. The 24–34ms spread is well inside the bar, and since
no song has tempo automations, `localTempoAtTick` returns the base tempo
everywhere today. This is a correctness-and-clarity fix that removes a
trap for a future slow song or tempo-changing arrangement — not a live
defect. It is worth doing because the semantics are wrong and the fix is
cheap, not because users are currently suffering.

**Ordering with the recording plan.** Both touch `playback-sync.ts`.
This plan is far smaller and has no open questions, so landing it *first*
is preferable — the recording plan's Phase 1 then measures against a
tempo-stable threshold rather than a moving one. If the recording work
lands first instead, this becomes a trivial rebase; there is no hard
dependency either way.

## Phase Breakdown

### Phase 1 — Convert the threshold

*No dependency.*

Delivers: tempo-invariant drift tolerance, with the invariance itself
under test.

1. Failing unit tests asserting the *same* real tolerance at several
   tempos spanning the catalogue's real range — a drift that trips the
   threshold at 93bpm must also trip it at 130bpm, and one that doesn't,
   doesn't. These fail today because the tick threshold is
   tempo-dependent (F001).
2. Replace the constant and convert the comparison to milliseconds at the
   local tempo. `[artifacts: infrastructure]`
3. Update `infrastructure.md`'s "50-tick drift threshold" wording to
   describe the millisecond tolerance and why it is tempo-stable.
   `[artifacts: infrastructure]`

### Phase 2 — Verify no regression

*Depends on Phase 1.*

Delivers: confidence that shipped playback behavior did not move in a way
anyone would notice.

1. Full suite green, with attention to the existing `playback-sync.test.ts`
   cases whose comments hard-code `DRIFT_THRESHOLD_TICKS(=50)` — they
   encode the old units and must be re-expressed, not merely re-tuned
   until green.
2. Live check on the slowest (Creep, 93bpm) and fastest (Lazy Eye,
   130bpm) catalogue songs — the two ends of the real range, and the two
   whose tolerance changes most.

## Open Questions

None. The constant is chosen and justified against the real catalogue,
the mechanism is unchanged, and the conversion helpers already exist.
