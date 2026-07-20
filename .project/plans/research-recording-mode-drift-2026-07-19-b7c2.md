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

---

# Sync acceptance criteria (T004b)

Specification only — no implementation. Defines what "in sync" means before
any further T004 work, because the ratchet round failed partly against an
implicit target of zero separation, which may not be achievable over this
protocol.

**Target: ~50 ms separation between two participants.**

## 1. Ticks are tempo-relative; the tolerance is absolute

50 ms is perceptual and therefore absolute. `DRIFT_THRESHOLD_TICKS` is a
fixed tick count, and ticks are tempo-relative (`TICKS_PER_QUARTER_NOTE`
= 960, so ticks/s = 16 × bpm). The existing 50-tick threshold therefore
means a *different* real tolerance at every tempo:

| tempo | ticks/s | 50 ticks = | 50 ms = |
|---|---|---|---|
| 60 bpm | 960 | 52.1 ms | 48 ticks |
| 87 bpm | 1392 | 35.9 ms | 70 ticks |
| 120 bpm | 1920 | **26.0 ms** | 96 ticks |
| 180 bpm | 2880 | 17.4 ms | 144 ticks |
| 240 bpm | 3840 | 13.0 ms | 192 ticks |

Two consequences:

- The current threshold is **tighter than the new target** everywhere above
  ~58 bpm — 26 ms at 120 bpm, half the 50 ms bar. So the pre-T004 seek storm
  was partly self-inflicted: the system was chasing a tolerance twice as
  strict as anyone can hear.
- The tick threshold gets *stricter as tempo rises*, which is backwards.
  Perceptual tolerance does not shrink at fast tempos; if anything a listener
  is more forgiving of absolute offsets in dense fast material.

**Recommendation: express both the acceptance bar and the correction
threshold in milliseconds, and convert to ticks at the local tempo at the
point of comparison.** `localTempoAtTick` already exists and is already
called on this path, and `ticksToMs` already exists in `tempo-lookup.ts`, so
this is a conversion at the comparison site, not new machinery. Concretely:
replace `DRIFT_THRESHOLD_TICKS = 50` with a `DRIFT_THRESHOLD_MS` and derive
ticks per comparison. A tempo-varying score gets the correct tolerance in
every section for free, which a fixed tick count cannot deliver at all.

Note this interacts with the acceptance bar: a 50 ms *correction* threshold
with a 50 ms *acceptance* bar leaves no headroom, since correction only fires
once the bar is already reached. The correction threshold should sit below
the acceptance bar — a threshold around 25–30 ms preserves roughly the
current 120 bpm behaviour while making it tempo-stable, and leaves margin.

## 2. What is measurable versus what must be assumed

This is the substantive finding of this spec, and it is a limit of the
protocol rather than of the implementation.

### Measured

- **A recording participant's reported position is a faithful proxy for its
  own real audio output.** Its `timePosition` tracks the underlying
  `HTMLAudioElement.currentTime` to within ~5 ms at every sample (T004a).
  `currentTime` is the browser's account of audio actually emitted.
- **A synth instance reports ~275 ms ahead of a recording instance** playing
  the same passage, varying by ~67 ms across playback starts.

### NOT measured, and not measurable over the existing protocol

- **A synth participant's reported-vs-real-audio offset (call it
  `L_synth`).** T004a never obtained an independent ground truth for the
  synth's real output; everything measured was synth-relative-to-recording.
  alphaTab 1.8.3 exposes no `outputLatency` and no `AudioContext` on its
  public API (re-verified against the 1.8.3 `.d.ts`; the dead end recorded in
  `feedback-audio-output-latency-t014-dfa8.md` still holds), so a client
  cannot measure its own `L_synth`, let alone publish it.
- **Any remote client's skew.** Nothing on the wire carries it, and adding it
  would be the protocol change this plan was explicitly shaped to avoid.

### The consequence

Write `reported` for a client's broadcast position and `real` for the audio a
listener actually hears. Forcing `reported_A == reported_B` gives:

```
audible separation = (reported_A − L_A) − (reported_B − L_B) = L_B − L_A
```

So **reported-position alignment bounds audible separation only when the two
clients' latencies are equal or both known.**

- **Uniform-source pairs (backing/backing, or synth/synth):** `L_A ≈ L_B` by
  construction — same engine, same code path. Audible separation ≈ reported
  separation, plus the ±5 ms proxy error at each end. Reported-position
  alignment is a **sound proxy**, and the 50 ms bar is assertable.
- **Mixed pairs (synth ↔ recording):** `L_recording ≈ 0` (measured), while
  `L_synth` is unknown and plausibly of order 275 ms given what was observed.
  `L_B − L_A` is therefore an unknown constant of roughly that magnitude.

**Stated plainly: reported-position alignment provably cannot bound audible
separation to 50 ms for a mixed synth/recording pair over the existing
protocol.** Aligning reported positions in that case may well be *creating*
an audible offset of order 275 ms rather than removing one — the correction
is confidently aligning two numbers that mean different things.

This is a second, independent reason to be wary of mixed sessions, distinct
from the rate divergence in §3. It is worth surfacing now because it bears
directly on T020: the guard's rationale is no longer only "high-Δbpm songs
separate", it is also "mixed-source sessions have an unmeasurable constant
offset at any Δbpm."

### The assumption to state explicitly

> **Assumption A1.** For uniform-source pairs, both clients' reported-vs-real
> audio offsets are equal, so reported-position separation is a faithful
> proxy for audible separation. Untested across *devices* — all T004a
> measurements ran two instances in a single page sharing one audio stack.
> Real sessions add per-device audio hardware, buffer sizes and OS mixing.
> A1 is plausible for identical engines but should be labelled an assumption
> until a two-device measurement exists (T023 is the natural place).

> **Assumption A2 (mixed pairs only).** No assumption available that gets
> from reported alignment to audible alignment. This case should be governed
> by a warning (T020), not by an acceptance threshold.

**A further measurement caveat applying to every number in this document:**
the CT harness runs both instances in one page, started from one `play()`
call, with no network in between. Real sessions add WebSocket latency, clock
offset between devices, and independent `play()` timing. **All separations
measured here are lower bounds on real-world separation.** The 50 ms bar
should be validated end-to-end (T021/T023) before it is trusted.

## 3. Three distinct phenomena, held apart

These have been blending together; the bar applies to only one of them.

| # | Phenomenon | Magnitude | Scope | Governed by |
|---|---|---|---|---|
| 1 | Rate divergence | `Δbpm × 16` ticks/s = `Δbpm × 8.33` ms/s at 120 bpm | mixed sessions only | **T020 warning** — not the 50 ms bar |
| 2 | Backing-*host* notated-vs-recording rate | same arithmetic, applied to the projection | any session with a backing-track host | **T004 option (a) rate-keying — unimplemented** |
| 3 | Per-start `play()` skew | 275–342 ms, re-rolled per start | **all** recording sessions | **T004 calibration — attempted, ratcheted** |

**(1) Rate divergence** is real physics and unfixable by correction. Time to
exceed the 50 ms bar, uncorrected:

| Δbpm | separation rate | exceeds 50 ms after |
|---|---|---|
| 0.5 | 4.2 ms/s | 12.0 s |
| 1 | 8.3 ms/s | 6.0 s |
| 2 | 16.7 ms/s | 3.0 s |
| 3.125 | 26.0 ms/s | 1.9 s |
| 6 | 50.0 ms/s | 1.0 s |
| 10 | 83.3 ms/s | 0.6 s |

A high-Δbpm mixed pair will exceed *any* tolerance; that is the guard's job.
(This table is also the natural input to **T005**: with a ~1 s broadcast
cadence, Δbpm ≈ 6 is where a mixed pair drifts a full 50 ms between
corrections — a defensible upper bound for the margin, and notably looser
than the 3.125 correction threshold the plan started from.)

**(2) Backing-host rate** is the plan's original premise and is **still
unimplemented**. Evidence it is real and separate: backing-host /
backing-participant at Δbpm = 10 produced 21 seeks over 20 s, where the
relative drift between two clients playing *the same recording* should be
exactly zero. The projection advances at the notated tempo while both real
clocks advance at the recording's tempo.

> **Therefore: T004 is (2) AND (3).** The calibration brief covered only the
> per-start skew. A working calibration alone does not complete T004; option
> (a) rate-keying is still required, and no test currently covers it.

**(3) Per-start skew** is the irreducible one. It affects uniform
backing/backing sessions at Δbpm = 0.5 — the 200-seek row in the T002 table —
so it is not a mixed-mode artifact and no scoping decision avoids it. Any
recording support at all must address it.

## 4. Pass/fail criteria per fixture and direction

Criterion, unless stated otherwise: **end-state reported-position separation
< 50 ms** (≈96 ticks at 120 bpm), sustained over a ≥20 s run. Seek count is a
**secondary** signal only — the ratchet round proved a low seek count is
achievable by simply ceasing to correct, so separation is the gate.

| # | Fixture | Host / participant | Expected | Why |
|---|---|---|---|---|
| C1 | aligned (Δbpm 0.5) | backing / backing | **PASS** | Uniform source, A1 applies. Rate divergence cancels (same recording). Only per-start skew. Already 0 seeks; needs the separation gate added. |
| C2 | aligned (Δbpm 0.5) | synth / backing | **PASS on reported position; audible NOT asserted** | Mixed, so A2: reported separation is assertable and should hold, but per §2 it does not bound audible separation. Assert the number; do not claim audible sync. |
| C3 | skewed (Δbpm 10) | backing / backing | **PASS — but FAILS today** | Both on the same recording, so true relative drift is zero and the bar should be met easily. It currently fails (21 seeks) purely from the unimplemented phenomenon (2). **This is the cleanest regression test for rate-keying**, since it isolates (2) from (1) entirely. |
| C4 | skewed (Δbpm 10) | synth / backing | **EXPECTED FAIL — assert the failure** | 83 ms/s divergence blows the bar in 0.6 s. Unfixable. The test should assert that separation *does* grow at ≈`Δbpm × 16` ticks/s, confirming the predicted physics and that T020's guard is warranted. A test expecting this to pass would be wrong. |

C3 is the most valuable case in the matrix and does not exist yet: it is the
only combination that isolates the backing-host rate problem from every other
phenomenon.

C4's assertion should be *directional* (separation grows at the predicted
rate) rather than a pass/fail threshold, so it documents a physical limit
rather than encoding a tolerance nobody should rely on.

## 5. Evaluation: calibrating against the local audio reference

**Hypothesis.** The ratchet forms because the skew estimate is
`host_projection − participant_position`, while the correction sets
`participant_position` from `host_projection` — a closed loop, so drift is
re-absorbed as skew. Calibrating instead against the participant's own
`audio.currentTime` never references the host projection, so drift cannot
feed back.

**Assessment: the ratchet claim holds; the hypothesis does not solve the
problem.**

It is correct that this removes the ratchet *by construction* — a purely
local quantity cannot close a loop with a remote correction. That part is
sound, and structurally different from attempt 2 (free-run-until-calibrated),
which only delayed the loop rather than opening it.

But T004a measured that exact local quantity: the participant's reported
position tracks its own `audio.currentTime` to **±5 ms**. So calibrating
against it would yield a skew of approximately **zero**, and compensate for
nothing. It removes the ratchet by removing the calibration.

**What this reveals is more useful than the hypothesis itself.** The
participant's reporting is already accurate to its own output. The quantity
that is wrong is the **synth host's** reported position, which leads its own
real output. So the compensation belongs at the *host's* reporting boundary —
the host should broadcast the position of audio it has **emitted**, not
scheduled — and the participant needs no calibration at all.

That reframing is attractive for three reasons: it is one correction at one
place rather than per-participant; it makes `PlaybackState.tickPosition` mean
the same thing regardless of the host's source, which is what the field
already implies; and it would benefit the synth-only path generally — plausibly
including the never-root-caused lyrics-ticker lead
(`feedback-audio-output-latency-t014-dfa8.md`), though **that connection
remains unestablished and must not be assumed**.

**The blocker: it requires `L_synth`, which is currently unmeasurable** (§2).
So this is the right shape but not currently actionable through alphaTab's
public API. Options, in preference order, all needing a decision:
1. Find a supported way to obtain the synth's output latency in 1.8.3
   (re-examine `api.player`; consider whether a patched/observed
   `AudioContext` is acceptable) — makes the clean fix available.
2. Accept mixed-source sessions as best-effort and unwarranted for audible
   alignment (§2, A2), correcting only reported position, with T020 warning.
3. Restrict sessions to uniform source, where A1 makes the whole problem
   tractable and phenomena (1) and (3)'s cross-source components vanish.

**What would falsify this assessment:** if the participant's reported
position turns out *not* to track its own `audio.currentTime` under real
conditions — across devices, under CPU load, or after seeks — then a local
reference would carry real signal and the hypothesis would become viable. The
±5 ms figure comes from a single-page CT harness on an idle machine and
should be re-measured across devices before being relied on.

## 6. Recorded: T002's deliberate retargeting

T002 as written asserted no more than one corrective seek per 10 s of
playback against the **high-divergence** (Δbpm = 10) fixture. That bar is
**physically unreachable** on that fixture and no correction strategy can
reach it: the two clocks genuinely separate at 160 ticks/s, crossing any
sane threshold several times a second through real divergence, not artifact.

The spec was therefore split deliberately:

- the **low-divergence** fixture carries the seek-rate bar, being the case
  where sync is achievable (200 seeks → 2 after calibration); and
- the **high-divergence** fixture asserts only that the *artifact* is gone
  (seek rate bounded by physics rather than by every sampled update),
  documenting the limit instead of encoding an unreachable tolerance.

This is a reasoned change to what the plan specified, recorded here so the
file stays an honest record rather than reading as a quietly relaxed
assertion. Per §4 it should be revised again: the seek-rate assertions become
secondary to the separation gate (C1–C4).
