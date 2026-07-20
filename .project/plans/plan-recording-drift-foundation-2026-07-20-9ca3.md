---
status: approved
branch: recording-drift-foundation
created: 2026-07-20
features: [sync-tabs-to-real-audio]
surfaced-defects: []
---

# Plan: Recording Playback — Session-Scoped, Drift-Correct

Supersedes `plan-sync-tabs-to-real-audio-2026-07-19-62cf.md`, whose
premises the Phase 1 diagnosis falsified. Consumes
`feedback-recording-drift-replan-4e1c.md` items F002–F007 (F001, the
global drift-threshold fix, is deliberately left for its own plan — it is
a latent bug in the shipped synth path and should not be gated behind
this feature).

## Goal

Let a session host switch the whole session between the alphaTab synth
and an operator-supplied real recording, with every participant's tab
cursor, lyrics, and position staying within ~50ms of each other — using
alphaTab's native backing-track playback and sync-point model.

## Scope

**In scope**

- `recording.mp3` + a `syncPoints` array (alphaTab's own `FlatSyncPoint`
  shape) as optional per-song catalog assets; loader publication and
  static serving with HTTP Range support.
- `Session.playbackSource` as a host-controlled, session-wide setting,
  with a `playback-source-set` message.
- alphaTab `PlayerMode.EnabledBackingTrack` engine path, engine rebuild
  on source change, mode-aware readiness.
- Backing-host rate-keying in the drift projection (feedback F003(ii)).
- Solving the per-`play()` start skew (F002) for the uniform-recording
  case, gated on end-state separation, not seek count (F007).
- Recording-mode carve-outs: per-part mute/solo, metronome, and count-in
  suspended session-wide with explanatory UI.

**Out of scope**

- **Per-participant / mixed-source sessions.** Designed, measured,
  rejected — see Technical Approach. This is the plan's single largest
  scope change from its predecessor.
- **The global `DRIFT_THRESHOLD_TICKS` → milliseconds conversion (F001)**
  — its own plan; independently shippable with no recording work.
- **Measuring `L_synth`** (the synth path's output latency). Needed only
  for the host-reporting-boundary fix, which mixed-source would have
  required; the uniform case does not. Left as a recorded `[OPEN: ...]`.
- YouTube / `EnabledExternalMedia`; in-app sync-point authoring; mixing
  synth audio with a backing track (alphaTab cannot — upstream #1961).
- `recordingTempoDivergence` and its UI guard — **removed entirely**, see
  below.

## Technical Approach

The Phase 1 diagnosis (`research-recording-mode-drift-2026-07-19-b7c2.md`)
confirmed the primitive works: `PlayerMode.EnabledBackingTrack` loads and
plays a real mp3 under Playwright CT, and every position consumer stays
clock-source agnostic. It also found two things that reshape this plan.

**1. Session-scoped source, not per-participant.** Aligning two clients'
*reported* positions produces audible separation equal to the difference
in their reported-vs-real-audio latencies. That difference is ~0 between
two recording clients (each tracks its own `HTMLAudioElement.currentTime`
to ±5ms — measured), but unknown and plausibly ~275ms between a recording
client and a synth one, because alphaTab 1.8.3 does not expose the synth
path's latency. So a mixed session cannot be held in audible sync, and
aligning it would *create* an offset rather than remove one. Making
source a session property removes that failure mode by construction.

This is what makes the plan tractable: **the uniform case needs no
unmeasured quantity.** Both ends report faithfully against their own
audio, so aligning reported positions genuinely aligns what people hear.

**2. The divergence guard is gone.** With everyone on the same recording,
tempo divergence from the notated score no longer separates participants
— they hear identical audio. `CatalogSong.recordingTempoDivergence`, its
catalog-load computation, its margin (F006), and its UI guard all drop
out of the design rather than being carried forward unused (constitution
Principle II). What remains of the Δbpm story is the *projection* rate:
`correctDrift` walks `masterBar.tempoAutomations`, which can never
observe a backing track's effective rate, so drift accumulates at exactly
`Δbpm × 16` ticks/sec — confirmed empirically. That is F003(ii), and it
is still real.

**3. The remaining hard problem is the per-`play()` start skew.** A
backing-track client's position is offset from the host's by ~275ms,
re-rolled on every start (275→342ms across a seek) because
`HTMLAudioElement.play()` completes asynchronously after decode/buffer.
No compensation constant can exist. Critically, `correctDrift`'s
arithmetic is *exact* (instrumented host deviation from its own
projection: 0 ticks, flat), so the fix must not go there — a rejected
calibration attempt that did put it there ratcheted, re-absorbing
accumulated drift as skew and scoring a great seek count while leaving
participants ~900ms apart.

Phase 1 below is therefore open-ended by design: it establishes *whether*
the uniform case can meet the 50ms bar before anything is built on it.
If it cannot, that is a finding worth having after one phase rather than
five, and the plan should stop there.

**Acceptance is end-state separation against a ~50ms bar — never
corrective seek count** (F007), which is trivially minimised by ceasing
to correct. The retained `RecordingDriftHarness.svelte` and the
`recording-skewed` / `recording-aligned` fixtures already exist and are
merged; this plan reuses them rather than rebuilding them.

## Phase Breakdown

### Phase 1 — Prove the uniform case can hold 50ms

*No dependency. **Gates every later phase** — if this cannot be met, stop
and re-decide rather than proceeding.*

Delivers: a measured answer to whether two backing-track clients can be
held within 50ms across start, seek, and sustained playback.

1. Extend `RecordingDriftHarness` to drive a backing-track *host* against
   a backing-track *participant* (the C1/C3 cases in the research doc's
   T004b matrix) — this direction has never been tested and is the one
   this plan depends on.
2. Failing CT spec asserting **end-state separation ≤50ms** on the
   aligned fixture, backing/backing, across a play → sustain → seek →
   resume cycle. Seek count recorded as a secondary observation only.
3. Implement backing-host rate-keying so the projection uses the
   recording's effective rate rather than the notated tempo (F003(ii)).
4. Solve the per-start skew for the uniform case (F002), *without*
   touching `correctDrift`'s arithmetic and without a mechanism that can
   re-absorb drift as skew. If no approach meets (2), **stop and report**
   — do not widen the threshold to pass.
5. Same assertion on the skewed fixture (Δbpm=10). Both clients hear the
   same audio, so this must also pass; failure means the rate-keying in
   (3) is incomplete.

### Phase 2 — Catalog assets & delivery

*No dependency on Phase 1 — genuinely parallel-safe now that the
divergence computation (which needed Phase 1's fixture) is gone.*

Delivers: a recording-capable song published and seekable over HTTP.

1. `FlatSyncPoint` re-exported from the shared package (alphaTab's own
   type, not a redefinition — Principles V/VI), with a type-test pinning
   it to upstream.
2. `CatalogSong` gains `recordingPath` and `syncPoints`.
3. Catalog loader discovers `recording.mp3` and reads `syncPoints`;
   a recording without sync points is treated as recording-less
   (skip-not-fatal, with a log).
4. `catalog-static.ts` gains `audio/mpeg` **and HTTP Range support** —
   required for `HTMLAudioElement` seeking, which every seek depends on.

### Phase 3 — Session source & engine

*Depends on Phases 1 and 2.*

Delivers: a host can switch the session to the recording and everyone
hears it, correctly synced.

1. `Session.playbackSource` + `playback-source-set` message, host-only
   authorization mirroring `playback-control`, rejected while playback is
   `running`. Server tests first. `[artifacts: datamodel, infrastructure]`
2. `createTabRenderer` accepts a player-mode option; backing-track path
   supplies the recording and applies sync points at `scoreLoaded`.
3. Mode-aware readiness — a backing-track instance loads no sound font
   and may never fire `soundFontLoaded`.
4. Engine teardown/rebuild on source change, reusing the song-change
   trigger shape (player mode is fixed at construction).
5. Count-in scheduling and the count-in cursor guard bypassed in
   recording mode.

### Phase 4 — UI

*Depends on Phase 3.*

Delivers: the feature as a user meets it, including its limits.

1. Host-only source control, shown only for a recording-capable song;
   participants see the current source read-only. `[artifacts: ui]`
2. Per-part mute/solo and the metronome disabled session-wide in
   recording mode with explanatory reason text; icon-only controls carry
   accessible names per the Bar's standing rule. `[artifacts: ui]`
3. Count-in ignored in recording mode, with the host's toggle still
   meaningful for the synth source.

### Phase 5 — End-to-end verification

*Depends on Phase 4.*

1. Multi-participant e2e: two participants, session in recording mode,
   full play/pause/seek/stop cycle, asserting separation stays within the
   50ms bar.
2. Regression pass confirming synth-only sessions are unchanged.
3. Browser-verify with a real recording and real sync points, including
   the still-owed confirmation that alphatab.net's Media Sync Editor
   export imports directly (established from the API in T003, never
   against the real GUI).

## Open Questions

1. **Can the uniform case actually hold 50ms?** The per-start skew admits
   no constant, `correctDrift` must not be touched, and the one attempted
   mechanism ratcheted. Phase 1 answers this, and a negative answer
   should stop the plan rather than route around it.
2. What is `L_synth`? Not needed for this plan's uniform-only scope, but
   it blocks the host-reporting-boundary fix (F004) that would make
   `PlaybackState.tickPosition` mean one thing regardless of host source
   — and it blocks mixed-source sessions permanently until answered.
   Recorded as an `[OPEN: ...]` in infrastructure.md.
3. Are the diagnosis's numbers representative? All were taken on one
   machine, one page, one shared audio stack, no network, a single
   `play()` — explicitly **lower bounds**. Real sessions add network
   jitter, clock offset, and independent `play()` calls. Phase 5's
   two-participant e2e is the first honest test of this.
4. Does the Media Sync Editor's export import directly? Established from
   alphaTab's API, never against the real GUI (T003). Owed one
   confirmation in Phase 5.
