---
status: open
created: 2026-07-19
---

# Feedback

Context: the `sync-tabs-to-real-audio` diagnosis phase
(`tasks-sync-tabs-to-real-audio-cb85.md`, Phase 1) ran and produced
findings that invalidate several of the plan's own premises. The plan is
being revised rather than extended — this file captures the reconsidered
decisions so a new plan can consume them. Full measurements and
derivations live in
`.project/plans/research-recording-mode-drift-2026-07-19-b7c2.md`
(sections T002, T003, T004a, T004b); this file records only the
*decisions* those findings force.

Nothing here is speculative: every item below is backed by measurement
from a real backing-track instance under Playwright CT, on the retained
`recording-skewed` / `recording-aligned` fixtures. Two standing caveats
apply to all of it, both flagged by the run itself: (1) every number is a
**lower bound**, taken on one machine, one page, one shared audio stack,
with no network and a single `play()`; (2) `L_synth` — the synth path's
own reported-vs-real-audio latency — was never measured and is not
exposed by alphaTab 1.8.3's public API.

## Bugs

- [ ] F001 `DRIFT_THRESHOLD_TICKS = 50` is a fixed *tick* count, so the
  real tolerance it enforces varies with tempo: 52ms at 60bpm, 26ms at
  120bpm, 13ms at 240bpm. It gets **stricter as tempo rises**, which is
  backwards, and above ~58bpm it is tighter than the ~50ms separation a
  musician can actually perceive. This is a **pre-existing issue in the
  shipped synth-only path**, not something recording mode introduced —
  the recording work merely exposed it. User has approved fixing it
  **globally**, for all playback paths, not as a recording-only special
  case. Express both the acceptance bar and the threshold in
  milliseconds, converting at the local tempo at the comparison site
  (`localTempoAtTick` and `ticksToMs` already exist and are already on
  this code path, so this is a conversion, not new machinery). Leave
  headroom between threshold and bar — a ~25–30ms threshold against a
  50ms bar preserves today's 120bpm behavior while making it
  tempo-stable. `[artifacts: infrastructure]`

- [x] F002 A backing-track participant carries a **per-`play()` start
  skew of ~275ms** against the host's reported position. It is invariant
  under `bufferTimeInMilliseconds` (250→2000ms gave 280/281/275/275, so
  the "half the buffer" explanation is a coincidence), stable to ±3ms
  *within* a playback, and **re-rolled on every start** (275ms → 342ms
  across a seek). Cause: `HTMLAudioElement.play()` completes
  asynchronously after decode/buffer, and whatever that delay is on a
  given start becomes a fixed offset for that playback. Consequence:
  **no compensation constant can exist**, and the skew alone (528–657
  ticks) exceeds the current 50-tick threshold permanently, producing a
  corrective seek on every sample. This fires in **uniform
  backing/backing sessions at Δbpm=0.5**, so it is not a mixed-mode
  artifact and no scoping choice avoids it — it is the irreducible core
  of making two people play one recording in sync.
  `[artifacts: infrastructure]`

## Reconsidered

- [x] F003 The plan's T004 was written as a single bounded fix with an
  (a)/(b) menu. It is actually **two independent phenomena**, and the
  revised plan must treat them as separate work: (i) the per-start skew
  above, and (ii) the original backing-*host* notated-vs-recording rate
  problem, which remains **unimplemented** and is confirmed to affect
  even backing/backing pairs (21 seeks at Δbpm=10 where relative drift
  should be zero, because the projection uses `localTempoAtTick` =
  notated while the host advances at the recording's tempo). A working
  fix for (i) does not complete T004. `[artifacts: infrastructure]`

- [x] F004 **Compensation belongs at the host's reporting boundary, not
  in `correctDrift`.** `correctDrift`'s arithmetic was instrumented and
  is exact — the host's deviation from its own projection is 0 ticks,
  flat across the whole broadcast window — so a correction term added
  there would corrupt a demonstrably correct function. A participant's
  reported position already tracks its own `HTMLAudioElement.currentTime`
  to ±5ms; it is the **host's** reported position that is wrong. Fixing
  it at the broadcast boundary (emit *emitted* position, not *scheduled*)
  is one change in one place, makes `PlaybackState.tickPosition` mean the
  same thing regardless of host source, and would benefit the synth-only
  path too. **Blocked on measuring `L_synth`**, which alphaTab 1.8.3 does
  not expose — the revised plan needs an explicit task for establishing
  it (loopback capture or an external reference), or an explicit decision
  to proceed without it. `[artifacts: infrastructure]`

- [x] F005 **Mixed-source sessions are materially worse than assumed when
  per-participant audio source was chosen.** Forcing two clients'
  *reported* positions to agree yields audible separation equal to the
  difference in their reported-vs-real-audio latencies. For a recording
  client that latency is ~0 (measured); for a synth client it is unknown
  and plausibly ~275ms. So reported-position alignment **provably cannot
  bound audible separation to 50ms for a mixed pair**, and may actively
  *create* an offset of order 275ms rather than remove one. This is a
  second, independent objection to mixed sessions and it applies **at any
  Δbpm** — not only tempo-divergent songs, which was the original
  premise. It strengthens the `recordingTempoDivergence` guard's
  rationale considerably, but it also reopens the question the user
  answered earlier: whether per-participant mixing should be *offered*,
  *warned against*, or *prevented*. The revised plan must put this
  decision back to the user rather than inheriting the earlier answer,
  which was given on the basis that mixing was safe at low Δbpm.
  `[artifacts: ui, infrastructure]`

- [x] F006 The `recordingTempoDivergence` safe margin derives to
  **Δbpm ≈ 6** at the ~1s broadcast cadence (where a mixed pair drifts a
  full 50ms between corrections) — notably *looser* than the 3.125 the
  original plan started from, which was the *correction* threshold rather
  than a perceptual one. Supersedes the plan's T005 derivation.
  `[artifacts: datamodel]`

- [x] F007 **Seek count is the wrong acceptance criterion** and must not
  be the primary gate in the revised plan. A low seek count is trivially
  achievable by ceasing to correct: the reverted calibration scored
  200:2 seeks while leaving participants **~900ms apart**. The gate must
  be **end-state separation** against the 50ms bar, per the C1–C4 matrix
  in the research doc's T004b section — including C4 (skewed mixed),
  which should be asserted to **fail directionally** rather than encode a
  tolerance nobody should rely on. Also supersedes the original T002
  assertion, whose 1-seek-per-10s target is physically unreachable on the
  high-divergence fixture. `[artifacts: infrastructure]`

## Retained from the abandoned run

Not feedback items — recording what survived, so the revised plan
doesn't re-task work that is already done and merged:

- `client/scripts/generate-recording-fixtures.mjs` plus the
  `recording-skewed` (Δbpm=10) and `recording-aligned` (Δbpm=0.5)
  fixtures — reproducible, all values derived from one constant.
- `client/src/test-harness/RecordingDriftHarness.svelte` — the
  measurement rig, with `hostBacking` / `participantSynth` /
  correction-off modes. Every finding above came from it.
- `client/src/recording-drift.ct.spec.ts` — retained in a `test.fail()`
  red state, documenting that the seek storm is real and unfixed, with
  its superseded assertion annotated rather than silently relaxed.
- T003's finding: sync points round-trip value-identically through
  `applyFlatSyncPoints()`/`exportFlatSyncPoints()` — store verbatim, no
  adapter, compare structurally (key order differs). The `pipeline.md`
  `[OPEN: ...]` marker is retired, with the caveat that this was
  established from alphaTab's API and **not** by driving the real
  alphatab.net editor GUI — still owed one confirmation against a real
  export.
- `@breezystack/lamejs` as a client devDependency (fixture mp3
  generation; plain `lamejs@1.2.1` is broken).
