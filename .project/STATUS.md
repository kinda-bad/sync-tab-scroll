# sync-tab-scroll — Project Status

_Updated: 2026-07-20-phase1-gate (**Recording-drift Phase 1 landed on main
and PASSED its 50ms gate; Phases 2–5 deliberately held for a go/no-go
decision.**)_

**Phase 1 gate result — PASS, verified at the code level.**
`tasks-recording-drift-foundation-cc87.md` is **in-progress (5/21)**:
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

0 consistency issues. Safe to /plan: yes. **Recommended next step: proceed
to Phase 2 via `/ardd-implement tasks-recording-drift-foundation-cc87.md`**
(Phase 1 gate passed and verified).
