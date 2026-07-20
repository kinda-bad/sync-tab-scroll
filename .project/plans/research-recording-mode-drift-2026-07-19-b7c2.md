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
