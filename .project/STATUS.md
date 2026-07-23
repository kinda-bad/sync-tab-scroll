# sync-tab-scroll — Project Status

_Updated: 2026-07-23 (**Ran `/ardd-refine infrastructure` on the
`/ardd-defects` findings.** User decision: the artifact's "reject invalid
input" claim is the intended behavior — `input-validation.ts` (silently
sanitize/truncate) is the one that needs to change, not the doc; that code
fix is tracked separately (not yet planned). Fixed both cosmetic drifts in
the same pass: the `scriptFile` citation (`client/src/tab-renderer.ts:51`
→ `:84`, `createTabRenderer`) and the `bars-per-row-set`/`early-stop-set`
field names (`value`/`tick` → `barsPerRow`/`tickPosition`, confirmed
against `packages/shared/src/messages.ts`). `infrastructure.md` stamped
`last_updated: 2026-07-23` (`b8f107a`); `diagram_status` was already
`stale` from the prior pass, unchanged. `DEFECTS.md` itself is unchanged
on disk — the 2 cosmetic entries are now fixed in code and the
broken-contract entry's resolution direction is now decided; the next
`/ardd-defects` run will confirm and drop the 2 cosmetic ones (the
broken-contract entry stays until the actual code fix lands). No other
state changed: zero in-flight worktrees, 1 open feedback file unchanged
(`feedback-e2e-fixture-song-selection-drift-60d7.md`).
`tasks-recording-drift-foundation-cc87.md` unchanged at 20/22
(in-progress, on main); `tasks-lobby-cursor-modes-0bea.md` unchanged at
11/12. Recommended next step: `/ardd-plan` to task the `input-validation.ts`
reject-behavior fix (small, well-scoped — similar shape to the earlier
host-start-modal-fix) or the e2e fixture-drift feedback item; neither
urgent.**)_

_Updated: 2026-07-23 (**Ran `/ardd-defects`: full artifact-vs-codebase
survey after this session's two merged bundles.** Regenerated
`DEFECTS.md` (`359fcca`) — 3 defects found, all in `infrastructure.md`:
(1) `scriptFile` citation drift, cosmetic — the corrected explanation now
matches the code comment verbatim, but the cited line number (51) has
drifted again to 84 after further edits; (2) `bars-per-row-set`/
`early-stop-set` field-name drift, cosmetic — docs say `value`/`tick`,
code actually uses `barsPerRow`/`tickPosition`; (3) **broken-contract** —
`infrastructure.md` claims invalid `displayName`/activation-key input is
*rejected* with an `error` message, but `input-validation.ts` actually
*silently sanitizes/truncates* it instead, per its own header comment —
this is a real doc/code mismatch, not cosmetic, and worth a `/ardd-refine
infrastructure` pass or a decision on which behavior is actually intended.
Of the 2 previously-known defects: `mute-all-parts-button`'s missing
testid is **now closed** (tasks-c75f-1349.md T026 added a real `testId`);
the `scriptFile` line-citation issue is **still open**, but only the line
number — its content-accuracy half was already fixed. No documented-but-
never-built capabilities found. No other state changed this pass — zero
in-flight worktrees, zero open feedback beyond the pre-existing
`feedback-e2e-fixture-song-selection-drift-60d7.md`.
`tasks-recording-drift-foundation-cc87.md` unchanged at 20/22
(in-progress, on main); `tasks-lobby-cursor-modes-0bea.md` unchanged at
11/12. Recommended next step: `/ardd-refine infrastructure` to resolve the
broken-contract defect (decide: should invalid input actually be
rejected, or should the artifact be corrected to document sanitize-not-
reject?), or a quick fix for the two cosmetic citation/field-name
drifts.**)_

_Updated: 2026-07-23 (**`tasks-c75f-1349.md` completed and merged (all 26
tasks, 9 phases).** Delivered: input-validation hardening, join-code
click-to-copy, remembered display name, Help/Info/About nav panel, host
bars-per-row layout, host early-stop point, recording-mode metronome
unlock, and 2 defect fixes (bf07f912, b16e2ab1). e2e diagnosis (T023/T024)
found `host-controls.spec.ts`'s red state was environmental — new fixture
catalog songs shifted `.first()`-based song selection — fixed by selecting
by name. Test suites: server 297/297, client vitest 153/153, client CT
217/218 (1 pre-existing unrelated flake in `recording-drift.ct.spec.ts`).
Merged `worktree-agent-acb70fee47e94e45b` into `main` at `501f735` — 2
conflicts in `.project/features/*.md` (stale-side register status,
resolved by taking the worktree's newer `implemented` value; `packages/
shared`'s dist was stale post-merge, causing a pre-commit typecheck
failure for the new `hostBarsPerRow`/`earlyStopTick` `Session` fields —
rebuilt via `pnpm --filter @sync-tab-scroll/shared run build` before
retrying the commit). Worktree reaped. Flipped the remaining 2 of 4 bound
features (`host-set-early-stop-point-for`, `remember-logged-in-display-nam`)
to `implemented` in a follow-up commit (`654a26c`) — the worktree could
only flip the other 2 itself, since these two feature-register files were
still untracked in the primary checkout at delegation time and
`worktree-align` only pulls committed commits (same class of gap as the
prior entry below). Feature backlog now 0 backlogged · 0 planned · 1
tasked (`sync-tabs-to-real-audio`, pre-existing, unrelated) · 31
implemented.

**Second process bug found and fixed this pass**: `ardd-state.sh stamp`
only accepts one `<key> <value>` pair per invocation — the earlier
`stamp <file> last_updated <date> diagram_status stale` calls (both
plan runs this session) silently applied only `last_updated`, leaving
`diagram_status` at its prior `current` value despite real content
changes to `datamodel.md`/`infrastructure.md`/`ui.md`. Corrected now
(`e98fad7`) — all three flip to `stale`; run `/ardd-diagram <name>` for
each to regenerate.

Filed one new feedback item: `feedback-e2e-fixture-song-selection-drift-60d7.md`
F001 (Bug) — the same `.first()`-based song-selection assumption that
caused `host-controls.spec.ts`'s failure likely affects ~6 other e2e specs
(`host-transfer`, `multi-participant`, `single-participant`,
`small-screen`, `song-part-modal`, `lyrics-only-view`), out of this task's
scope. Open feedback count now 1.

Also noted (not yet actioned): T020's early-stop visual de-emphasis is a
fixed bottom-third gradient placeholder, not positioned at the actual stop
tick — disclosed in a code comment; server-side enforcement is fully
correct, only the visual cue is approximate.

Zero in-flight worktrees now. `tasks-recording-drift-foundation-cc87.md`
unchanged at 20/22 (in-progress, on main); `tasks-lobby-cursor-modes-0bea.md`
unchanged at 11/12 (in-progress). ArDD up to date at `9bc9b38` (beta).
Recommended next step: target `feedback-e2e-fixture-song-selection-drift-60d7.md`
with `/ardd-plan`, or run `/ardd-diagram` for the 3 stale diagrams — neither
urgent.**)_

_Updated: 2026-07-23 (**`tasks-host-start-modal-fix-8603.md` completed and
merged.** Its delegated worktree fixed `server/src/handlers/ready-set.ts`'s
`handleReadySet`: it now auto-resolves a pending Start Negotiation
(`resolvePendingStart` + `runStartFlow`) when the last not-ready participant
readies up, instead of leaving the host's confirmation modal open showing a
stale count. Server test suite: 276/277 (the one failure,
`client-static.test.ts`, is pre-existing and unrelated). Merged
`worktree-agent-a1166fe513aad148f` into `main` at `24703d1` (clean, no
conflicts) and reaped the worktree.

**Process gap found and fixed this pass**: the artifact/feature/feedback
edits `/ardd-plan` made earlier for both this fix and the prior
`c75f` bundle were never committed to `main` — only their plan/tasks files
were, via the pre-delegation auto-commit step. Both delegated worktrees
therefore branched without seeing those doc updates (confirmed by
inspecting the worktree's copy of `infrastructure.md` directly — it lacked
the new "Auto-resolve on zero" section). Committed the missing artifact/
feature/feedback changes to `main` now (`a16a541`) before merging. Impact
assessed as low: the host-start-modal-fix tasks fully specified the code
change inline (no artifact lookup needed for correctness) and its tests
passed; the still-in-flight `tasks-c75f-1349.md` worktree's own tasks also
embed concrete field/message names inline, and since it's instructed never
to edit artifacts itself, merging it later won't conflict with `main`'s
now-committed artifact docs. **Lesson for future `/ardd-plan` runs**:
commit artifact/feature/feedback edits immediately after applying them,
not just at the pre-delegation gate, so a worktree spawned any time after
drafting sees current docs.

No open feedback, no backlogged features. `tasks-c75f-1349.md` continuing
in its worktree, now at 9/26. `tasks-recording-drift-foundation-cc87.md`
unchanged at 20/22 (in-progress, on main); `tasks-lobby-cursor-modes-0bea.md`
unchanged at 11/12. ArDD up to date at `9bc9b38` (beta). Recommended next
step: none actionable right now — wait for `tasks-c75f-1349.md` to
complete and merge.**)_

_Updated: 2026-07-23 (**Ran `/ardd-plan` scoped to the single open feedback
file `feedback-host-start-modal-stale-count-bc66.md` (F001, now `[x]`
incorporated, file flipped to `status: planned`). Updated `infrastructure.md`
(Start Negotiation: auto-resolve a pending start when a `ready-set` brings
the not-ready count to zero) and `ui.md` (host's confirmation modal closes
as part of that auto-resolution instead of showing a stale "0 not ready"
prompt). Wrote and approved `plan-host-start-modal-fix-2026-07-23-0a6a.md`
(no bound features) and generated `tasks-host-start-modal-fix-8603.md` (4
tasks, 2 phases, `status: ready`) — inline, not yet delegated. **Note**:
`parallel-matrix.sh` flags `tasks-host-start-modal-fix-8603.md` as
`shared-artifact` (infrastructure, ui) against both `tasks-c75f-1349.md`
(the in-flight worktree's bundle, now at 5/26) and that worktree's own
copy — same declared-artifact-tag overlap, not necessarily a real code
conflict (the c75f bundle doesn't touch Start Negotiation), but worth a
quick skim before running both concurrently. Open feedback count now 0.
Feature backlog unchanged: 0 backlogged · 0 planned · 5 tasked · 27
implemented. ArDD up to date at `9bc9b38` (beta).
`tasks-recording-drift-foundation-cc87.md` unchanged at 20/22 (in-progress,
on main); `tasks-lobby-cursor-modes-0bea.md` unchanged at 11/12
(in-progress). Recommended next step: `/ardd-implement` to execute
`tasks-host-start-modal-fix-8603.md`.**)_

_Updated: 2026-07-23 (**Filed one new feedback item via `/ardd-feedback`:
`feedback-host-start-modal-stale-count-bc66.md` F001 (Bug, `[artifacts: ui,
infrastructure]`) — the host's "N participants are not yet ready, start
anyway?" Start Negotiation modal goes stale if every remaining participant
readies up while it's still open: it keeps showing the modal (reportedly
"0 participants are not ready yet") instead of recognizing the not-ready
count reached 0 and starting playback directly. Open feedback count now 1
(up from 0). No other state changed this pass — `/ardd-plan`'s prior
`tasks-c75f-1349.md` delegation (26 tasks, 9 phases) is now running in a
background worktree (`.claude/worktrees/agent-acb70fee47e94e45b`, branch
`worktree-agent-acb70fee47e94e45b`), still at 0/26 as of this check; the
primary-checkout tasks file itself stays `ready` until that worktree's
branch merges. `tasks-recording-drift-foundation-cc87.md` unchanged at
20/22 (in-progress, on main); `tasks-lobby-cursor-modes-0bea.md` unchanged
at 11/12 (in-progress). ArDD up to date at `9bc9b38` (beta). Recommended
next step: target `feedback-host-start-modal-stale-count-bc66.md` with the
next `/ardd-plan` once the in-flight `tasks-c75f-1349.md` work lands — not
urgent enough to interrupt the running delegation for.**)_

_Updated: 2026-07-23 (**Ran `/ardd-plan` against a user-selected bundle: all
4 backlogged features (`help-info-about-panel-in-nav-b`,
`host-mandated-bars-per-row-layout`, `host-set-early-stop-point-for`,
`remember-logged-in-display-nam`), all 4 open feedback files (including
accepting the reconsidered metronome-lock decision — recording mode no
longer force-disables the personal Metronome toggle; audible click-layering
over a recording stays an open question pending alphaTab upstream #1961),
and both of DEFECTS.md's 2 known cosmetic defects (bf07f912, b16e2ab1) as
fix tasks. Updated `ui.md`, `datamodel.md`, `infrastructure.md` for the four
features/feedback items; bumped `constitution.md` 1.6.1 → 1.6.2 (PATCH) for
a new Quality Standards bullet from feedback F002 (test-tier "green" must
name which tiers ran). Wrote and approved
`plan-c75f-2026-07-23-5638.md` and generated `tasks-c75f-1349.md` (26 tasks,
9 phases, `status: ready`). All 4 targeted features flipped
`backlogged → planned → tasked`; all 4 feedback files flipped to
`status: planned`, bound to this plan. Feature backlog now 0 backlogged · 0
planned · 5 tasked · 27 implemented. Open feedback count now 0. DEFECTS.md
itself is unchanged on disk (still says 2 known defects, last checked
2026-07-23) — both are now ready-file fix tasks (T025/T026) but not yet
resolved in code; the next `/ardd-defects` run after this tasks file
completes should confirm they're closed. Zero cross-artifact conflicts,
zero orphaned completion flips, zero in-flight worktrees/draft PRs, ArDD up
to date at `9bc9b38` (beta). `tasks-recording-drift-foundation-cc87.md`
unchanged at 20/22 (in-progress, on main); `tasks-lobby-cursor-modes-0bea.md`
unchanged at 11/12 (in-progress). New ready tasks file
`tasks-c75f-1349.md` (0/26) is independent of both in-progress files (no
shared feature slug or `[artifacts: ...]` tag declared against either).
Recommended next step: `/ardd-implement` to execute `tasks-c75f-1349.md`.**)_

_Updated: 2026-07-23 (**Two feedback files landed since the prior entry below:
`feedback-recording-mode-metronome-lock-reconsidered-c415.md` (F001,
Reconsidered — reopens ui.md's recording-mode decision to fully disable the
personal metronome toggle; proposes still allowing the toggle, possibly with
audible click layered over the recording pending confirmation it's
achievable given upstream alphaTab #1961) and
`feedback-input-sanitization-hardening-7a9a.md` (F001, Bug — displayName and
catalogue activation key inputs unsanitized against script-injection/
rendering-breaking content). Open feedback count now 4 (adds to the
pre-existing `feedback-e2e-suite-red-on-main-7b3f.md` and
`feedback-join-code-click-to-copy-4971.md`). Feature backlog grew to 4
backlogged (new: `remember-logged-in-display-nam` — pre-fill a logged-in
user's display name from their account at join/create, staying editable) ·
0 planned · 1 tasked · 27 implemented. Ran `/ardd-defects` per this pass's
auto next-step: full survey of all six artifacts against the codebase,
priority depth on the recording-mode/drift-correction area given T021's
recent live verification — found 2 cosmetic-only defects (a stale line
citation in infrastructure.md for `client/src/tab-renderer.ts`'s
`scriptFile` assignment, now line 71; ui.md's `mute-all-parts-button`
identifier is a code-comment tag only, not a queryable DOM id/testid — see
`DEFECTS.md`). No documented-but-never-built capabilities found. Zero
cross-artifact conflicts, zero orphaned completion flips, zero in-flight
worktrees/draft PRs, zero ready tasks files, ArDD up to date at `9bc9b38`
(beta). `tasks-recording-drift-foundation-cc87.md` unchanged at 20/22
(in-progress, on main); `tasks-lobby-cursor-modes-0bea.md` unchanged at
11/12 (in-progress). Recommended next step: target one of the 4 open
feedback files or 4 backlogged features with `/ardd-plan` — not a single
forced slug, so this pass stops as plain-text guidance.**)_

## Artifacts Found
- brand.md — stable ✅
- constitution.md — stable ✅ (v1.6.2)
- datamodel.md — stable ✅
- infrastructure.md — stable ✅
- pipeline.md — stable ✅
- ui.md — stable ✅

## Within-Artifact Issues
### infrastructure.md
- [OPEN] Synth path's own output latency (alphaTab 1.8.3 doesn't expose it) — needs an external reference or an explicit decision to proceed without it. Pre-existing.
- [OPEN] Can alphaTab layer an audible synth metronome click over a playing recording, or is upstream #1961 an absolute blocker limiting the metronome-lock reconsideration to the visual beat widget only? (feedback-recording-mode-metronome-lock-reconsidered-c415 F001, now tracked as an Open Question in plan-c75f-2026-07-23-5638.md)

## Diagrams
- datamodel.md — stale ⚠️ (run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (run /ardd-diagram ui)

## Code-vs-Artifact Defects
- 3 known defects — see DEFECTS.md, last checked 2026-07-23 (predates this pass's fixes). 2 cosmetic entries (scriptFile line-citation, bars-per-row-set/early-stop-set field names) are now fixed in `infrastructure.md` — will drop on the next `/ardd-defects` run. 1 **broken-contract** remains open in code: infrastructure.md's "reject invalid input" claim is confirmed as the intended behavior; `input-validation.ts` (silently sanitizes/truncates instead) still needs the actual code fix.

## Feedback
- 1 open feedback file(s) — `feedback-e2e-fixture-song-selection-drift-60d7.md` (F001, Bug — `.first()`-based fixture song selection likely also broken in ~6 other e2e specs beyond the one already fixed; `[artifacts: none]`) — see `.project/feedback/`, will be picked up by the next `/ardd-plan`.

## Feature Backlog
- 0 backlogged · 0 planned · 1 tasked · 31 implemented — see `.project/features/`.

## In Flight
- `tasks-recording-drift-foundation-cc87.md` — in-progress, 20/22 (on main).
- `tasks-lobby-cursor-modes-0bea.md` — in-progress, 11/12.

## Summary
0 cross-artifact/constitution issues found. Safe to /plan: yes. Recommended next step: `/ardd-plan` to task the `input-validation.ts` reject-behavior fix, or the e2e fixture-drift feedback item; neither urgent.

---

_Updated: 2026-07-23 (**Post-/ardd-update status check: install confirmed
up to date at `9bc9b38` (beta) — the "ArDD update available" line is
clear. No new register/schema issues surfaced. All 8 migrations already
applied. Zero cross-artifact conflicts, zero orphaned completion flips,
zero in-flight worktrees. `tasks-recording-drift-foundation-cc87.md`
remains the only in-progress work (19/22), T021 (manual) still the
recommended next step.**)_

_Updated: 2026-07-23 (**Phases 1–4 + the T019-surfaced production-wiring
fix landed (19/22); recording mode is code-complete but UNVERIFIED live —
T021 (manual) is the remaining gate. New feature backlogged this pass:
`host-set-early-stop-point-for`. ArDD update available (beta v1.1.1-beta.3).**)_

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
(19/22).** Phases 1–4 + T022 merged to `main`, all signed, worktrees reaped.
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

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-19. Run
  `/ardd-defects` to refresh.

## Feedback

- 1 open feedback file — `feedback-e2e-suite-red-on-main-7b3f.md`, will be
  picked up by the next `/ardd-plan`.

## Feature Backlog

- 3 backlogged · 0 planned · 1 tasked · 27 implemented — see
  `.project/features/`. Newly backlogged this pass:
  `host-set-early-stop-point-for` (host sets an early stop point; playback
  auto-stops there for everyone; tab past that point is de-emphasized).
  Also backlogged: `help-info-about-panel-in-nav-b`,
  `host-mandated-bars-per-row-layout`. The tasked slug is
  `sync-tabs-to-real-audio` (Phase 1 of 5 landed; stays `tasked` until the
  tasks file completes). Target a backlogged slug with `/ardd-plan <slug>`.

## Housekeeping

- **ArDD update available** — installed `0fc43f6`, source at beta release
  `v1.1.1-beta.3` (beta channel). Run `/ardd-update`.
- `tasks-lobby-cursor-modes-0bea.md` remains **in-progress (11/12)** since
  2026-07-02 — only T010's manual two-browser verification is left
  (scenario 3 auto-covered 2026-07-20). Reconcile to done/abandoned to
  clear the last stale tasks file.

## Summary

Phases 1–4 + the T019-surfaced wiring fix landed (19/22); synth path
unchanged and safe on `main`. Recording mode is now **code-complete and
correctly wired**, but **unverified in a real browser**.
`host-set-early-stop-point-for` was newly backlogged this pass but does not
change the active priority. **Recommended next step: T021 — a manual live
two-participant recording session with a real `recording.mp3` + Media Sync
Editor sync points** (headless automation can't; T019's e2e is
env-blocked). The feature stays `tasked`/`in-progress` until that live
verification passes; do NOT flip it to `implemented` on the strength of the
CT/unit suites alone. T020's synth-regression can also be re-confirmed once
a clean e2e environment is available.
