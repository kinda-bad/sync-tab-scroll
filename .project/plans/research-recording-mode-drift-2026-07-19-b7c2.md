---
topic: recording-mode drift — is per-participant audio source safe?
date: 2026-07-19
status: complete
---

# Research: Recording-Mode Drift

## Question

`sync-tabs-to-real-audio` was re-scoped mid-plan from a session-level
host toggle to a **per-participant** audio source: one participant hears
the mp3 while another in the same session hears the synth. Does that
create a drift/sync problem serious enough to send the design back to
the session-level toggle?

Method: static analysis of `playback-sync.ts`, `tempo-lookup.ts`, and
the installed alphaTab 1.8.3 `.d.ts`. **Not empirically measured** — no
recording-mode instance was run. The arithmetic below is exact; the
claim that a corrective seek is audible is inference from the existing
host-echo incident (`playback-sync.ts:41-47`), not observation.

## Findings

### 1. The extrapolation always uses the *notated* tempo — confirmed

`correctDrift` projects the host's last-reported tick forward by
wall-clock elapsed time (`playback-sync.ts:118-124`), converting ms→ticks
via `localTempoAtTick`, which walks `masterBar.tempoAutomations`
(`tempo-lookup.ts:30-33`).

alphaTab stores sync points in a **separate** collection —
`MasterBar.syncPoints: Automation[]` (`alphaTab.d.ts:10825`), distinct
from `tempoAutomations` (`:10819`). `BackingTrackSyncPoint.syncBpm` is
documented as *"the BPM the song will have **virtually** after this sync
point to align the external media time axis with the one from the
synthesizer"* (`:4381-4384`).

So in backing-track mode alphaTab advances position at `syncBpm`, while
`localTempoAtTick` keeps returning the notated tempo. **The two never
meet.** This is a code-level fact, not a hypothesis.

### 2. The exact tolerance: ±3.1 BPM

With `DRIFT_THRESHOLD_TICKS = 50`, `TICKS_PER_QUARTER_NOTE = 960`, and a
host tick-report interval of 1000ms (`playback-engine.ts:518-522`),
elapsed time between reports maxes at ~1s. Error accumulated in that
window:

```
error_ticks = elapsed_s × Δbpm × (960/60) = elapsed_s × Δbpm × 16
```

At `elapsed_s = 1`, the 50-tick threshold is crossed when
**Δbpm > 3.125** — i.e. ~2.6% at 120bpm. Below that, no correction ever
fires. Above it, a corrective seek fires roughly **once per second**, and
in backing-track mode that seek re-seeks the HTMLAudioElement.

### 3. The critical correction: this is NOT a per-participant problem

The session-level design does not escape it. Work the arithmetic for
**uniform** recording mode (host *and* participant both on the mp3):

- participant's actual tick = `hostTick + elapsed × realRate`
- projected tick = `hostTick + elapsed × notatedRate`
- drift = `elapsed × |realRate − notatedRate|` — **identical formula**

Both designs need `correctDrift` made sync-point-aware. Choosing the
session-level toggle buys nothing here. That was the load-bearing
assumption behind sending the design back, and it does not hold.

### 4. What *is* genuinely per-participant-only

The difference is in what the drift *means*:

- **Uniform mode** — every participant's audio agrees; the drift is a
  pure math artifact of the wrong extrapolation rate. Fixing the
  extrapolation fixes it **completely**.
- **Mixed mode** — the two audio streams genuinely run at different
  speeds. Sync points are a *map*, not a time-stretch: they tell alphaTab
  where bar N sits in the mp3; they cannot make the mp3 play at the
  notated tempo. When Δbpm is material, the mp3 listener and the synth
  listeners **really do separate**, and no correction strategy fixes it —
  correction can only choose between letting them drift or seeking the
  mp3 every second.

Magnitude without any correction: Δbpm = 3.1 → ~26ms separation per
second → **~1 full beat after 30 seconds**. Musically fatal.

### 5. But Δbpm is usually ~0, and it is computable

Sync points exist mostly to fix the **start offset** — where bar 1 lands
in the mp3 — not the rate. For a studio/click-track recording with a
correct transcription, `syncBpm ≈ notated tempo` and Δbpm ≈ 0: mixed mode
is fine and *no corrections ever fire*. Live, rubato, or
sloppily-transcribed material is where it breaks.

Crucially, **Δbpm is derivable at catalog-load time**: compare each sync
point's `syncBpm` against the notated tempo at its `synthTick`. A song
whose recording diverges beyond the safe margin can be detected
automatically and flagged, rather than discovered mid-song by a confused
band.

### 6. Bonus: alphaTab's own import shape answers research Q3

`Score.applyFlatSyncPoints(FlatSyncPoint[])` / `exportFlatSyncPoints()`
(`alphaTab.d.ts:14977-14982`), where `FlatSyncPoint` is
`{barIndex, barPosition, barOccurence, millisecondOffset}`
(`:8463-8481`). This is alphaTab's own serialization shape and what the
Media Sync Editor round-trips — so `meta.json` should store
`FlatSyncPoint[]` **verbatim** and call `applyFlatSyncPoints()`, rather
than the bespoke `{barIndex, occurence, syncTimeMs}` shape earlier
proposed. Retires open question 3 from the original vetting doc
(Principle V/VI: use the library's own named type).

## Recommendation

There are **two distinct problems**, and they land on opposite sides of
the decision. Conflating them produces the wrong answer.

**(A) The extrapolation-rate bug (§1–3)** — present in *both* designs,
fixable, identical cost either way. **Not a reason to prefer either
design.** Reverting to session-level buys nothing here.

**(B) Mixed-mode musical divergence (§4)** — **per-participant only, and
unfixable.** Session-level eliminates it *by construction*: if the mode
is a property of the session, a session can never contain one synth
listener and one mp3 listener at the same time, so the divergence cannot
arise. This is a genuine red flag, and the session-level fallback is a
genuine mitigation for it.

So the choice is a real tradeoff, not a free win:

- **Per-participant** — delivers the mixed capability that was asked
  for; accepts that on songs whose recording tempo drifts from the
  notated tempo, participants on different sources audibly separate.
  Bounded and *guardable* (Δbpm computed at catalog load, §5), and a
  non-issue for studio/click-track recordings where Δbpm ≈ 0.
- **Session-level** — no divergence ever, at the cost of the mixed
  capability.

**Recommended: per-participant, with the Δbpm guard** — the risk is
bounded, detectable ahead of time, and the mixed capability was the
explicit ask. But this is a tradeoff to accept knowingly, not an absence
of risk.

Either way, ship these three:

1. **Key `correctDrift`'s extrapolation rate off the *host's* source** —
   it is the host's reported ticks being projected, so a synth host
   advances at the notated tempo and a recording host at `syncBpm`.
   Required in *both* designs; not a cost of the per-participant choice.
2. **Compute Δbpm at catalog load** and treat a song whose recording
   diverges beyond the safe margin (~3 BPM, per §2) as *not* offering
   per-participant mixing — surface it in the UI rather than letting a
   band discover it by separating.
3. **Phase 1 empirical test before any UI** — host on synth, participant
   on recording, with a deliberately skewed recording; measure whether
   corrective seeks fire and whether they are audible. This is the one
   claim above that is inferred rather than measured.

Framing worth keeping: in mixed mode the residual risk is **musical, not
technical** — it is the same risk as one band member playing along to a
different recording. If the recording matches the tab's tempo they stay
together; if it doesn't they don't. The app's job is to *surface* that,
not to prevent it.

## Rejected Alternatives

- **Revert to the session-level host toggle** — *not* rejected on the
  merits; it is a live option, and the only one that eliminates (B)
  outright. Rejected only as a response to the *extrapolation bug*, which
  §3 shows it shares identically. Choose it if mixed-source sessions are
  not worth the divergence risk.
- **Time-stretch the recording to the notated tempo** — out of scope and
  quality-destroying; alphaTab offers no such facility.
- **Tighten `DRIFT_THRESHOLD_TICKS`** — backwards; a tighter threshold
  fires *more* corrective seeks, not fewer.

## Open Questions

1. Is a once-per-second corrective seek on an HTMLAudioElement actually
   audible, or does alphaTab absorb it? (Phase 1 test.)
2. Where exactly to put the Δbpm safety margin — 3.125 BPM is the
   correction threshold, but the *musical* tolerance is likely tighter.
3. Should a Δbpm-unsafe song disable recording mode entirely, or only
   warn when the session is actually mixed?

---

## Resolved (T002 / T003, tasks-sync-tabs-to-real-audio-cb85.md)

### T003 — `FlatSyncPoint` persistence compatibility

**Finding: byte-compatible in substance; store verbatim, no adapter needed.**

Determined from alphaTab's own round-trip API rather than the alphatab.net
Media Sync Editor GUI — this run had no interactive browser to click the
editor through, so the GUI export was *not* exercised. What was verified,
against alphaTab 1.8.3 in-process:

```
score.applyFlatSyncPoints(meta.syncPoints)
score.exportFlatSyncPoints()  ->  value-identical to the input
```

for all 16 sync points of both T001 fixtures. The only difference is JSON
**key order** (`applyFlatSyncPoints` re-emits `barIndex, barOccurence,
barPosition, millisecondOffset`; the authored file uses `barIndex,
barPosition, barOccurence, millisecondOffset`). Field names, types and
values all match exactly, so a strict `JSON.stringify` comparison differs
while a structural comparison does not. Since the Media Sync Editor is
itself built on `exportFlatSyncPoints`, its export is the same shape.

*Caveat for a human follow-up:* confirm against a real editor export
before relying on this for externally-authored content (T023).

### T002 — measured drift/seek behaviour, before any fix

Real alphaTab under Playwright CT, 20 s runs, headless Chromium. Two
instances, host tick reported at the production ~1/s cadence, real
`correctDrift` sampled at 10 Hz (mirroring the store subscription).
`PlayerMode.EnabledBackingTrack` **does load and play an mp3 backing track
under CT** — the primitive the whole plan rests on is confirmed working.

| host / participant | Δbpm=10 | Δbpm=0.5 |
|---|---|---|
| synth / synth *(control)* | 12 seeks, all during the first ~1.3 s, then **0** | — |
| synth / **backing** | **200** seeks (every sample) | **200** |
| **backing** / synth | 29 | 13 |
| **backing** / **backing** | **200** | **200** |

200 seeks in 20 s = a corrective seek on *every* store update, forever.
Peak divergence ranged 1129–1875 ticks across configs.

**Two independent causes, isolated by re-running with correction disabled:**

1. **A constant ~160-tick (~83 ms at 120 bpm) offset** on any
   backing-track *participant*: its reported `tickPosition` sits
   persistently behind the other instance. Identical at Δbpm=0.5 and
   Δbpm=10, so it is playback/reporting latency, **not** tempo
   divergence. It alone exceeds `DRIFT_THRESHOLD_TICKS` (50)
   permanently — sufficient to explain every one of the 200 seeks. No
   projection fix can beat it, because the seek *is* the latency source.

2. **Genuine accumulating drift at exactly `Δbpm × 16` ticks/s**, as the
   plan predicted, confirmed empirically:
   - Δbpm=10 → offset ran −200 → +2514 ticks over 17 s (≈160/s)
   - Δbpm=0.5 → offset ran −520 → −387 ticks over 17 s (≈8/s)

   So alphaTab's sync points do **not** rate-normalise tick advance: a
   backing-track instance advances at the **recording's** tempo.

**Consequence for T004 — the task's (a)/(b) menu is incomplete.**

The premise ("`localTempoAtTick` can never observe the recording's rate")
is *real but not dominant*, and it only bites in the **backing-host /
synth-participant** direction — there the participant projects the host at
notated 120 while the host actually advances at 130, and the Δbpm
sensitivity shows up plainly (29 seeks at Δbpm=10 vs 13 at Δbpm=0.5).
Option (a) (infer the host's rate from observed tick advance) is the right
fix *for that direction*.

But it does nothing for the 200-seek configs, which are the common case.
Those need a different change: **a backing-track participant should not be
drift-extrapolated at all** — the recording is its clock, and seek-chasing
a synth host is itself the stutter. That is a third option the task does
not list, and T002 cannot go green without it.

**Also note (feeds T020):** at Δbpm=10 the two clocks genuinely run
160 ticks/s apart. No projection fix holds a mixed synth+recording pair
inside a 50-tick threshold — seeks are unavoidable *if you insist on
syncing them*. "Everyone on the recording" is safe at any Δbpm; the mixed
case is what T020's guard must refuse or warn about.

---

## Resolved (T004a — offset root cause)

Investigation of the constant offset that dominates T002's seek storm,
ordered by the coordinator before any correction strategy is chosen. All
numbers are from real alphaTab 1.8.3 under Playwright CT, headless
Chromium, against the `recording-aligned` fixture (Δbpm = 0.5, so tempo
divergence contributes ≈8 ticks/s and cannot account for anything below).

### First, a correction to the T002 write-up

T002 reported the offset as "~160 ticks (~83 ms)". **That number was an
artifact of the measurement**: it was taken from *corrected* runs, where
`correctDrift` was re-seeking every 100 ms and continuously suppressing
the very quantity being measured. The honest free-running figure is
**≈ −452 ticks ≈ −235 ms**, and measured directly against real audio
output (below) it is **≈ 275 ms**. The two-cause structure of the T002
finding is unaffected; only the magnitude was wrong.

### What was measured

**1. The projection is not at fault.** Instrumenting `correctDrift`'s own
internals at each sample and recording the host's *own* deviation from the
projection it produces:

| config | participant drift | host drift |
|---|---|---|
| synth host / synth participant | −0 ticks | −0 ticks |
| synth host / **backing** participant | **−452 ticks (−235 ms)** | **0 ticks** |

`hostDrift ≈ 0` exactly, and flat across the whole 0–1000 ms broadcast
window (−454 ticks at 0–250 ms, −449 at 750–1000 ms). So
`localTempoAtTick`, the extrapolation and the 1 Hz broadcast cadence are
all doing their job perfectly. The displacement is entirely in the
backing-track participant's reported position.

**2. The backing-track side is the ACCURATE one.** Reading the
`HTMLAudioElement` alphaTab creates (one element, `blob:` src) alongside
both instances:

```
wall=4268   hostTimeMs=3373   partTimeMs=3090   audio.currentTime=3095
wall=10286  hostTimeMs=9387   partTimeMs=9115   audio.currentTime=9113
wall=12293  hostTimeMs=11395  partTimeMs=11124  audio.currentTime=11120
```

`partTimeMs` tracks `audio.currentTime` **to within ~5 ms at every
sample**. `currentTime` is the browser's report of actually-emitted audio,
so alphaTab's backing-track position reporting is faithful to real output.
The synth instance reads ~275 ms *ahead* of that. This is the direction
the coordinator flagged as likely — the recording is not "late", the two
clocks simply disagree — and it is measured, not inferred.

**3. It is NOT the configurable output buffer.** `bufferTimeInMilliseconds`
(default 500) was varied across an order of magnitude:

| `bufferTimeInMilliseconds` | synth lead over real audio output |
|---|---|
| 250 | 280 ms |
| 500 | 281 ms |
| 1000 | 275 ms |
| 2000 | 275 ms |

Completely invariant. This **falsifies** the obvious hypothesis (that the
lead is half the 500 ms synth buffer — 250 ms is temptingly close to the
observed value, and alphaTab's core does contain a `halfBufferCount`
term). It is a coincidence. `BufferSize = 4096` / `BufferCount = 32` do
not map to it either. alphaTab 1.8.3 still exposes no `outputLatency` or
`AudioContext` on its public API, so the dead end recorded in
`feedback-audio-output-latency-t014-dfa8.md` and plan-1619 Phase 3 **still
holds** and was not re-derived further.

**4. It is a per-playback START SKEW, not a fixed constant.** The decisive
test — measure the offset, then pause, seek both instances to tick 20000,
replay, and measure again:

```
PHASE 1 (from tick 0)     mean=275 ms   min=272  max=277
PHASE 2 (after seek)      mean=342 ms   min=339  max=344
```

Within a playback the offset is rock-stable (±3 ms spread over ~4 s of
sampling — both clocks run at exactly real time). Across playback starts
it **changes by 67 ms**. Four independent mounts in test 3 gave
275/275/280/281 ms, so it is reproducible for a given start but not a
constant of the system.

### Conclusion: what the offset is

**A start-alignment skew between the synth clock and the
`HTMLAudioElement`.** alphaTab does not tightly co-schedule the audio
element's start with the synth's tick clock: `HTMLAudioElement.play()`
completes asynchronously after decode/buffer, and whatever delay that
takes on a given start becomes a fixed offset for the whole of that
playback. Both clocks then advance at exactly real time, which is why the
offset is flat within a phase and why no amount of tempo/rate correction
touches it.

**Is it eliminable at source? Partly, and not by a constant.** Because the
value is re-rolled on every start/seek, no named compensation constant can
exist — that route is closed, which is precisely the "unexplained number
calcifying into a workaround" outcome the coordinator wanted to avoid.
The two real options are (a) measure the skew once per playback start and
apply a single correction, rather than seek-chasing it continuously at
10 Hz, or (b) stop comparing the two clocks at all for a backing-track
participant, since the recording is provably ground truth for what that
participant hears.

**If compensation is needed, it belongs at the position-reporting
boundary, not in `correctDrift`.** `correctDrift`'s arithmetic is
demonstrably correct (`hostDrift = 0`); adding an offset term there would
be compensating in the wrong place, and would not generalise to the other
consumers of position (lyrics ticker, beat widget, cursor) that read
`playerPositionChanged` directly.

### What this does NOT establish (explicitly)

**The incidental lyrics-ticker connection is NOT supported by this data.**
Hypothesis 1 in the brief — that the synth reports ahead of its own
audible output, which would explain the existing synth-only ticker lead
(`feedback-audio-output-latency-t014-dfa8.md`, `feedback-lyrics-timing-tiro-c741.md`
F001) — would require an independent ground truth for the *synth's* real
output, which this run never obtained. Everything above is synth-relative-
to-recording. Worse for that hypothesis, the 67 ms shift across starts
points at the variable-latency component being on the **audio element**
side, not the synth side. So this investigation neither confirms nor
refutes the ticker-lead theory, and should not be cited as evidence for
it. Establishing it would need a genuine external reference (e.g. loopback
capture, or a patched `AudioContext` with a start anchor) — not attempted.

### Recommendation for T004 (not implemented — awaiting decision)

Option (b): a backing-track participant should not be time-extrapolated
against another clock at all. Per the coordinator's correction, this must
**keep** the drift-comparison block so host seeks are still followed
(non-hosts follow seeks through that block, and seek-while-paused relies
on it with `elapsedTicks = 0`) — the change is to drop the *time-based
extrapolation term*, not to `return null`. Note that this alone is still
insufficient with the current 50-tick threshold: a 275–342 ms start skew
is 528–657 ticks, so the comparison would still trip every sample. The
threshold, or the position the comparison is made against, has to absorb
the start skew too. That is the open design question T004 now turns on.

---

## T004 status — calibration implemented, NOT yet correct (STOP POINT)

Per the coordinator's decision, calibration is measured once per playback and
applied at the position-reporting boundary (`backing-track-calibration.ts`,
wired into `correctDrift` via an optional `calibrator` argument; a synth
participant passes `undefined` and is byte-for-byte unaffected).

### What worked

Three refinements were each forced by measurement, not guessed:

1. **A settle gate** (`CALIBRATION_SETTLE_TICKS`). The skew is not present at
   `play()`; it develops over the audio element's spin-up (within 8 ticks at
   250 ms, steady ~530 by 2.3 s). Calibrating immediately captured ~195 of
   ~530 ticks and fixed nothing.
2. **Free-run until calibrated.** With correction active from the start, the
   corrections drag the participant into agreement and *erase the very skew
   being measured* — captured values collapsed to ~150 ticks. Seek-following
   is preserved throughout by still applying any difference larger than
   `MAX_CALIBRATION_SKEW_TICKS`.
3. **Median of a sample pool** (`CALIBRATION_SAMPLE_COUNT`). Single-sample
   capture was wildly noisy across identical runs (420, 227, −96, −5 ticks);
   the median recovered the true value (519 vs the ~530 measured
   independently).

Seek counts over 20 s, Δbpm = 0.5: synth host 200 → **2**; backing host
200 → **0**. Δbpm = 10: 200 → 18, i.e. now bounded by the genuine
`Δbpm × 16` physics rather than by the artifact.

### Why this is NOT done

**The seek reduction is partly illusory, and a seek-count-only test hides
that.** Adding an end-state separation assertion exposed it: on the
Δbpm = 0.5 fixture the participant finishes **1730 ticks (~900 ms) behind
the host**, where genuine accumulation over that run is only ~160 ticks.
The captured `skewTicks` had ratcheted to ~1735, close to the
`MAX_CALIBRATION_SKEW_TICKS` guard of 1920.

The mechanism is a **ratchet**: `correctDrift` resets the calibrator after
each applied seek (justified — T004a measured a seek re-rolling the skew, and
the audio element's re-buffer transient must not be read as drift). But each
*re*-calibration then happens at a moment when the participant has already
drifted, so the accumulated drift is re-absorbed as "skew". Calibration
progressively redefines what counts as in sync, the participant is allowed to
fall ever further behind, and the seek count drops **because correction has
effectively stopped** — not because sync improved.

This is precisely the failure the coordinator's criterion 3 was written to
catch, so it is being reported rather than tuned around. The 1920-tick guard
is far too permissive to act as a backstop (the real skew is ~530), but
merely tightening it would be threshold-tuning against a symptom.

The likely correct shape: recalibration after a seek must re-measure the skew
against a reference that is itself known-good, rather than against a
projection the participant has already drifted from — e.g. calibrate only
from the *first* playback of a phase and treat post-seek recalibration as a
bounded adjustment to the existing skew rather than a fresh unconstrained
measurement. Not implemented; needs a decision.

**Current test state:** `recording-drift.ct.spec.ts`'s low-divergence case is
marked `test.fail()` and genuinely fails on the separation assertion. The
seek-rate assertion passes. Nothing here should be read as T004 complete.
