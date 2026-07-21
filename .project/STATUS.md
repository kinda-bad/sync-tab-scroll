# sync-tab-scroll — Project Status

_Updated: 2026-07-20-wiring-fixed (**Phases 1–4 + the T019-surfaced
production-wiring fix landed (19/21); recording mode is code-complete but
UNVERIFIED live — T021 (manual) is the remaining gate.**)_

**✅ The Phase 5 wiring defect is FIXED and merged (T022, `1e7a0d6`).** The
production `correctDrift` caller (`playback-engine.ts`) now passes
`isBackingParticipant`, keyed off **engine truth** (`api.score?.backingTrack
!= null`) rather than session state — so a recording-mode participant
free-runs its own audio instead of seek-chasing. The gap the T019 gate
found (no test over the production call path) is closed by a CT regression
test that drives the real `ensurePlaybackEngine` subscription across a
synth→recording switch, verified **RED (participant jumped 6496 ticks)
before the fix, GREEN after**. `projectionBpm` deliberately left unwired
(unreachable under session-wide source). **This proves the mechanism is
wired — NOT that recording mode works end-to-end** (see T019/T021 below).

**Progress: `tasks-recording-drift-foundation-cc87.md` in-progress
(19/21).** Phases 1–4 + T022 merged to `main`, all signed, worktrees reaped.
- **Phase 2** (T006–T011): `FlatSyncPoint` re-exported from shared (with a
  structural type-test), `recordingPath`/`syncPoints` on `CatalogSong`,
  loader discovery of `recording.mp3` (skip-not-fatal when unanchored),
  `audio/mpeg`, and **HTTP Range support** (206/416, traversal guard kept).
- **Phase 3+4** (T012–T018): `Session.playbackSource` + host-only
  `playback-source-set` handler (rejected while running; song-change resets
  to synth), `EnabledBackingTrack` renderer path (synth path byte-for-byte
  unchanged when `playerMode` omitted), mode-aware readiness (validated
  empirically that `midiLoaded` fires with no soundfont), engine rebuild on
  source change, recording-mode count-in bypass (host synth toggle stays
  live), host source control + recording-mode carve-outs for
  mute/solo/metronome. Server vitest 274, client vitest 153, CT specs run
  green (tab-renderer, playback-engine, SettingsModal, a11y). Shared
  `isRecordingCapable()` predicate is the single source of truth.

**Phase 5 remaining — T019 `[ ]`, T020 `[ ]`, T021 `[ ]`.**
- **T019 (two-participant e2e)** is **environment-blocked here**: the
  headless e2e **wedges** on the live synth→recording switch (~90 s
  unresponsive; matches the known "automation audio races/wedges" quirk),
  so it can't produce a clean automated measurement in this environment.
  The T022 CT regression above covers the specific wiring it was meant to
  catch; a true independent-`play()`, real-transport measurement still
  awaits a working e2e environment or the manual T021.
- **T020 (synth regression)** — synth path is *proven unchanged* (the
  wiring fix touches only the recording branch; server vitest 274, client
  vitest 153, client CT green), but a clean full-suite e2e green wasn't
  obtained here (pre-existing machine-saturation noise on unchanged code,
  not a regression).
- **T021 is manual and carries the real verification weight** — a real
  `recording.mp3` + sync points authored in alphatab.net's Media Sync
  Editor dropped into a catalog song, then a live two-participant browser
  session confirming cursor/lyrics/beat-widget track the recording with no
  audible stutter (and that the editor's export imports directly). Headless
  automation can't do this (Chrome blocks port 6000; audio races/wedges).

**Phase 1 gate result — PASS, verified at the code level.**
T001–T005 merged to `main` (`e8006de..a1af8da`, 5 signed commits, worktree
reaped). Two backing-track clients on the same recording finish
**~0.001–0.002 ms apart** on both the `recording-aligned` (Δbpm=0.5) and
`recording-skewed` (Δbpm=10) fixtures — decisively under the 50 ms bar
(RED state was 82.6 ms).

**The winning mechanism is categorical, not a compensation constant:** a
backing-track participant **free-runs its own `HTMLAudioElement` instead of
being drift-corrected** (`correctDrift` gains an `isBackingParticipant`
early-return after the status branches). Both clients play the identical
mp3 and each tracks its own `audio.currentTime` to ±5 ms, so the pair is
locked by construction; turning correction *on* was what injected the
60–80 ms (a self-inflicted seek storm during the host's ~300 ms per-`play()`
start-skew window). `correctDrift`'s projection arithmetic is **untouched**;
T003's rate-keying (`syncPointRateAtTick`) only swaps *which tempo value*
feeds the existing formula. No post-drift skew re-measurement exists, so the
ratchet that failed the prior attempt cannot form. Synth path is
byte-for-byte unchanged.

**Disclosed caveats carried into Phase 5 (honest lower bounds, not
false-green):**
- All Phase 1 numbers come from the single-page CT harness, one shared
  audio stack, one `play()` sequence. The harness seek is a **dual
  reposition** of both instances (models a server-broadcast seek both
  follow) — it does *not* exercise an independent late-join seek where the
  ~300 ms start-skew would surface. That is T019/e2e (Phase 5).
- In the uniform backing/backing path, T003's rate-keying is now **dead**
  (the participant free-runs and never enters the projection block); it
  remains correct and unit-tested for non-uniform directions. T005 passes
  via free-run, not via rate-keying.

## Go/No-Go: Phases 2–5

Phase 1 answered the plan's gating open question ("can the uniform case hold
50 ms?") in the affirmative, by a mechanism that honors every hard
constraint. **Recommended: proceed to Phase 2** (catalog assets & delivery,
T006–T011 — independent of Phase 1, TDD, low risk). Phases 3–5 build the
session source/engine, UI, and the honest cross-device e2e (T019) that will
stress the disclosed caveats above. Continue with
`/ardd-implement tasks-recording-drift-foundation-cc87.md`.

## Artifacts

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| brand.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | 1 |
| pipeline.md | stable ✅ | — |
| ui.md | stable ✅ | — |

### Open questions

- **infrastructure.md** — `[OPEN]` `L_synth`, the synth path's own output
  latency (infrastructure.md:141). Intentionally open: not needed for this
  plan's uniform-only scope; it blocks only the host-reporting-boundary fix
  (F004) and mixed-source sessions, both explicitly out of scope.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅

(All three regenerated 2026-07-20, committed `e8006de`.)

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-19. Run
  `/ardd-defects` to refresh.

## Feedback

- 1 open feedback file — `feedback-e2e-suite-red-on-main-7b3f.md`, will be
  picked up by the next `/ardd-plan`.

## Feature Backlog

- 1 backlogged · 0 planned · 1 tasked · 27 implemented — see
  `.project/features/`. The tasked slug is `sync-tabs-to-real-audio`
  (Phase 1 of 5 landed; stays `tasked` until the tasks file completes). The
  backlogged slug is `host-mandated-bars-per-row-layout`.

## Housekeeping

- **ArDD update available:** installed `33ac9ae`, source at `v1.0.3-beta.1`
  — run `/ardd-update`.
- `tasks-lobby-cursor-modes-0bea.md` remains **in-progress (11/12)** since
  2026-07-02 — only T010's manual two-browser verification is left
  (scenario 3 auto-covered 2026-07-20). Reconcile to done/abandoned to
  clear the last stale tasks file.

## In Flight

Nothing — the Phase 1 worktree merged and was reaped.

## Summary

Phases 1–4 + the T019-surfaced wiring fix landed (19/21); synth path
unchanged and safe on `main`. Recording mode is now **code-complete and
correctly wired**, but **unverified in a real browser**. **Recommended next
step: T021 — a manual live two-participant recording session with a real
`recording.mp3` + Media Sync Editor sync points** (headless automation
can't; T019's e2e is env-blocked). The feature stays `tasked`/`in-progress`
until that live verification passes; do NOT flip it to `implemented` on the
strength of the CT/unit suites alone. T020's synth-regression can also be
re-confirmed once a clean e2e environment is available.
