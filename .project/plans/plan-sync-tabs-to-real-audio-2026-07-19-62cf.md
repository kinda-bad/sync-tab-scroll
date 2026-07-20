---
status: approved
branch: sync-tabs-to-real-audio
created: 2026-07-19
features: [sync-tabs-to-real-audio]
surfaced-defects: []
---

# Plan: Sync Tabs To Real Audio

## Goal

Let each participant personally choose, per song, between the alphaTab
synth and an operator-supplied real recording — with tab cursor, lyrics,
and session position staying in sync either way — using alphaTab's native
backing-track playback and sync-point model, with no change to the server
protocol or session state.

## Scope

**In scope**

- `recording.mp3` + a `syncPoints` array (alphaTab's own `FlatSyncPoint`
  shape) as optional per-song catalog assets; loader publication and
  static serving with HTTP Range support.
- A per-participant, per-song audio-source preference (`synth` |
  `recording`), stored client-locally alongside the existing metronome
  and mute-parts preferences.
- alphaTab `PlayerMode.EnabledBackingTrack` engine path, including
  engine rebuild on source switch and a mode-aware readiness gate.
- Host-source-keyed drift extrapolation — the correctness fix that makes
  any recording playback viable at all.
- The mixed-source divergence guard: `recordingTempoDivergence` computed
  at catalog load, surfaced in the UI.
- Recording-mode carve-outs: per-part mute/solo, personal metronome, and
  count-in disabled with explanatory UI, for that participant only.

**Out of scope**

- YouTube / any `EnabledExternalMedia` adapter — TOS-encumbered, a
  separate proposal if ever (`research-sync-tabs-to-real-audio`).
- In-app sync-point authoring — a later addition to phase-2 in-app
  authoring; MVP sync points are authored externally via alphatab.net's
  Media Sync Editor.
- Mixing synth audio with a backing track — alphaTab cannot do it
  (upstream #1961). This is the constraint the carve-outs exist for, not
  a gap to close.
- Any server session-state, `PlaybackState`, or wire-message change.
  Zero protocol change is a deliberate property of this design.

## Technical Approach

alphaTab 1.6+ (installed: 1.8.3) already ships both halves of the hard
problem — backing-track playback (`PlayerMode.EnabledBackingTrack`,
driving its own `HTMLAudioElement`) and the tick↔recording-time map
(`MasterBar.syncPoints`, Guitar Pro 8's own model). Per constitution
Principle V we consume both rather than building an alignment engine, and
per Principle VI we store alphaTab's own `FlatSyncPoint` type verbatim
rather than a bespoke shape needing translation on both ends
(datamodel.md).

Every position consumer in the client — cursor, lyrics ticker, lyrics
sheet, beat widget, hazard-bar progress, the host's tick report —
already subscribes to `api.playerPositionChanged` / `api.tickPosition`
and is therefore clock-source agnostic. None of them change. The host
remains functional clock authority through the identical API surface
(infrastructure.md), so the server never learns that recordings exist.

The one genuinely load-bearing seam is **drift extrapolation**.
`correctDrift` projects the host's last-reported tick forward using
`localTempoAtTick`, which walks `masterBar.tempoAutomations`. alphaTab
keeps sync points in a *separate* collection (`MasterBar.syncPoints`),
and `syncBpm` is expressly "the BPM the song will have virtually after
this sync point" — so a tempo-automation walk can never observe a
recording's effective rate. Error accumulates at `elapsed_s × Δbpm × 16`
ticks, crossing the existing 50-tick threshold within one ~1s report
interval once Δbpm exceeds ~3.1, producing a corrective seek roughly
every second — which in backing-track mode re-seeks the audio element.
Per `research-recording-mode-drift-2026-07-19-b7c2.md` this is a property
of *source mismatch*, present identically in a uniform-recording session,
so the extrapolation rate is keyed off the **host's** source, not the
participant's own.

Separately and unfixably: because source is per-participant, a session
can mix synth and recording listeners, and sync points are a map rather
than a time-stretch. Where a recording's real tempo diverges materially
from the notated tempo, those two groups genuinely separate and no
correction strategy helps. That divergence is computable ahead of time
from the sync points themselves, so it is detected at catalog load and
guarded in the UI rather than discovered mid-performance.

Phase 1 exists because the most expensive failure here is building UI on
a sync model that turns out to stutter. It retires the plan's open
questions empirically, against a deliberately skewed recording, before
anything user-visible is built.

## Phase Breakdown

### Phase 1 — Diagnosis & drift foundation

*No dependency. Must complete before Phases 3–4.*

Delivers: a proven, tested drift model for backing-track playback, and
empirical answers to the questions the design currently defers.

1. Build a skewed test fixture — a synthetic song whose recording tempo
   deliberately diverges from its notated tempo by a known Δbpm, with
   sync points, in the fixture catalog.
2. Failing CT test (Principle VII): host on synth + participant on
   recording against that fixture; assert on corrective-seek frequency
   and position divergence. Establishes whether the naive path stutters
   and by how much.
3. Verify alphatab.net's Media Sync Editor export is byte-compatible
   with `FlatSyncPoint[]` as stored in `meta.json`, or identify the
   adapter needed. *(Retires the pipeline.md `[OPEN: ...]`.)*
4. Decide and implement host-source-keyed extrapolation in
   `correctDrift` — either inferring the host's effective rate from
   observed tick advance across reports, or putting the host's source on
   the wire. *(Retires the infrastructure.md Session & Real-Time Sync
   `[OPEN: ...]`. `[artifacts: infrastructure]`)*
5. Derive the empirical safe margin for `recordingTempoDivergence` from
   the measurements in (2). *(Feeds Phase 4's guard.)*

### Phase 2 — Catalog assets & delivery

*Server code is parallel-safe with Phase 1, with one tie: the
divergence-computation task's test fixture comes from Phase 1's skewed
fixture, so that one task waits.*

Delivers: a recording-capable song visible end-to-end in the published
catalog, fetchable and seekable over HTTP.

1. `FlatSyncPoint` re-exported from the shared package; `CatalogSong`
   gains `recordingPath`, `syncPoints`, `recordingTempoDivergence`.
2. Catalog loader discovers `recording.mp3`, reads `syncPoints` from
   `meta.json`, and treats a recording without sync points as
   recording-less (skip-not-fatal, with a log).
3. `recordingTempoDivergence` computed at load by comparing each sync
   point's effective `syncBpm` against the notated tempo at its tick.
4. `catalog-static.ts` gains an `audio/mpeg` content type and **HTTP
   Range support** — required for `HTMLAudioElement` seeking, which
   every drift correction and host seek depends on.
5. A real recording-capable song added to the fixture catalog.

### Phase 3 — Recording playback engine

*Depends on Phases 1 and 2.*

Delivers: a participant can hear a real recording, correctly synced,
with the cursor and lyrics tracking it.

1. `createTabRenderer` accepts a player-mode option; backing-track path
   supplies the recording and applies sync points at `scoreLoaded` via
   `applyFlatSyncPoints()`.
2. Mode-aware readiness — a backing-track instance loads no sound font
   and may never fire `soundFontLoaded`; readiness becomes `scoreLoaded`
   + backing-track load, branching on the *local* participant's source.
3. Per-song, per-device audio-source preference module, following the
   existing `metronome-preference.ts` / `track-mute-preference.ts`
   pattern.
4. Engine teardown/rebuild on source switch (player mode is fixed at
   construction), reusing the existing song-change trigger shape.
5. Count-in scheduling and the count-in cursor guard bypassed in
   recording mode.

### Phase 4 — UI: source control, carve-outs, and guard

*Depends on Phase 3; consumes Phase 1's measured safe margin.*

Delivers: the feature as a user actually meets it, including its limits.

1. Audio-source control in the settings modal's personal preferences,
   shown only for a recording-capable song.
2. Per-part mute/solo and the personal metronome disabled in recording
   mode with explanatory reason text, for that participant only —
   icon-only controls carry accessible names per the Bar's standing
   rule. *(`[artifacts: ui]`)*
3. Count-in: a recording-mode participant locally ignores
   `Session.countInEnabled`; the host's toggle stays live for everyone
   else.
4. Mixed-source divergence guard surfaced at the point of choice, using
   Phase 1's margin. *(Retires the ui.md `[OPEN: ...]` on whether a
   divergent song disables the source outright or warns only when the
   session is actually mixed. `[artifacts: ui]`)*

### Phase 5 — End-to-end verification

*Depends on Phase 4.*

Delivers: confidence the sync claim holds in a real multi-participant
session, not just in unit tests.

1. Multi-participant e2e: two participants on different sources through
   a full play/pause/seek/stop cycle, asserting they stay together on a
   low-divergence song.
2. Regression pass confirming synth-only sessions are bit-for-bit
   unchanged — the default path must not move.
3. Browser-verify against a real recording in the live app.

## Open Questions

1. Is a once-per-second corrective seek on an `HTMLAudioElement`
   actually audible, or does alphaTab absorb it? *(Phase 1.2 — the one
   claim in the research that is inferred rather than measured.)*
2. Host-source inference vs. putting the host's source on the wire.
   Inference preserves the zero-protocol-change property; the wire is
   simpler to reason about. *(Phase 1.4.)*
3. Where exactly the `recordingTempoDivergence` safety margin sits.
   3.125 BPM is the *correction* threshold; the *musical* tolerance is
   likely tighter. *(Phase 1.5.)*
4. Does a divergent song disable the recording source outright, or warn
   only when the session is actually mixed? The latter preserves the
   "everyone on the recording" case, which is safe at any divergence.
   *(Phase 4.4.)*
5. Is the Media Sync Editor's export directly importable, or is a small
   adapter needed? *(Phase 1.3.)*
