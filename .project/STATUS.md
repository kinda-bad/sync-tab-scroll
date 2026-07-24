# sync-tab-scroll — Project Status

_Updated: 2026-07-24 (**Ran `/ardd-status`: refresh after `/ardd-plan
feedback-spotlight-mode-force-follow-br-f438.md` drafted, approved, and
tasked `plan-f841-2026-07-24-bdce.md` (Fix Spotlight mode force-follow) —
3 phases (Reproduce a red CT spec / Fix / Close out), 6 tasks in
`tasks-f841-8faf.md`, now `status: ready`. F001 flipped to `planned`; no
feature-register slugs bound (plan `features: []`).** Artifacts (6, all
`status: stable` except `constitution.md` v1.6.2 which has no `status`
field by convention): `brand.md`, `constitution.md`, `datamodel.md`,
`infrastructure.md`, `pipeline.md`, `ui.md` — all read in full.

## Artifacts Found
- brand.md — stable ✅
- constitution.md — stable ✅ (v1.6.2, `next_step_prompt: auto`)
- datamodel.md — stable ✅
- infrastructure.md — stable ✅
- pipeline.md — stable ✅
- ui.md — stable ✅

## Cross-Artifact Issues
None found. No entity/field/endpoint referenced in one artifact and left
undefined in another.

## Within-Artifact Issues
No unresolved `[OPEN: ...]` placeholders or TODOs found in any artifact.
No draft-status artifacts blocking planning.

## Constitution Compliance
No violations found.

## Diagrams
- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅

## Code-vs-Artifact Defects
0 known defects — see `DEFECTS.md`, last checked 2026-07-23. The newly
logged Spotlight force-follow bug is filed as feedback (F001 below), not
a defect — it's a code bug caught by live manual testing, not
artifact-vs-code drift; `ui.md`'s Spotlight description still matches the
intended design.

## Feedback
0 open feedback files — `feedback-spotlight-mode-force-follow-br-f438.md`
(F001) is now `status: planned`, bound to `plan-f841-2026-07-24-bdce.md`.

## Feature Backlog
0 backlogged · 0 planned · 0 tasked · 32 implemented — see
`.project/features/`. No feature carries a non-empty `epic` — by-epic
breakdown omitted.

## Documented but Untracked
None found.

## Orphaned Completion Flips
None found.

## Work Queue
- `tasks-f841-8faf.md` — plan `plan-f841-2026-07-24-bdce.md`, features
  none: no other `ready` tasks file to compare against
  (`parallel-matrix.sh` silent with fewer than two ready files); no
  in-flight worktree claims it either.

## In Flight
- `tasks-lobby-cursor-modes-0bea.md` — in-progress, 11/12 (T010 left
  unchecked pending `tasks-f841-8faf.md`'s Spotlight force-follow fix).
- No other worktrees, no `worktree-reap.sh --dry-run` candidates. ArDD
  install up to date at `9bc9b38fa85` (beta channel).

## Summary
0 issues found. Safe to /plan: yes. Recommended next step: `/ardd-implement`
to execute `tasks-f841-8faf.md` — write the red CT spec (T001), diagnose
and fix the `isReadyForPlayback`/Spotlight-follow root cause (T002-T003),
run the full suite and one live two-tab re-verification (T004-T005), then
check off T010 in `tasks-lobby-cursor-modes-0bea.md` (T006).

_Updated: 2026-07-24 (**Ran `/ardd-status`: full refresh after
`tasks-recording-drift-foundation-cc87.md` reached `status: completed`
(T019 two-participant e2e passed the 50ms bar, T020 full-suite regression
check clean) and merged to main; the `sync-tabs-to-real-audio` feature
register entry is flipped to `implemented`.** Artifacts (6, all
`status: stable` except `constitution.md` v1.6.2 which has no `status`
field by convention): `brand.md`, `constitution.md`, `datamodel.md`,
`infrastructure.md`, `pipeline.md`, `ui.md` — all read in full.

## Artifacts Found
- brand.md — stable ✅
- constitution.md — stable ✅ (v1.6.2, `next_step_prompt: auto`)
- datamodel.md — stable ✅
- infrastructure.md — stable ✅
- pipeline.md — stable ✅
- ui.md — stable ✅

## Cross-Artifact Issues
None found. No entity/field/endpoint referenced in one artifact and left
undefined in another; infrastructure.md's synth-path output-latency
decision (instrumented `AudioContext` anchor, resolved last run) remains
consistent with datamodel.md's `PlaybackState.tickPosition` notes and
ui.md's recording-mode carve-out language.

## Within-Artifact Issues
No unresolved `[OPEN: ...]` placeholders or TODOs found in any artifact
(confirmed by direct grep across `.project/artifacts/*.md`). No
draft-status artifacts blocking planning.

## Constitution Compliance
No violations found. Production Annotations (datamodel.md's placeholder
ToS version, infrastructure.md's out-of-band datastore/secrets and
hand-rolled OAuth) remain correctly flagged as annotated shortcuts, not
silent gaps.

## Diagrams
- datamodel.md — current ✅
- infrastructure.md — current ✅ (regenerated in the prior
  `docs(diagrams)` commit)
- ui.md — current ✅

## Code-vs-Artifact Defects
0 known defects — see `DEFECTS.md`, last checked 2026-07-23 (all 3
previously-recorded defects confirmed closed). Run `/ardd-defects` to
refresh if code has changed since.

## Feedback
No open-feedback section — 0 files at `status: open` across 50
`.project/feedback/feedback-*.md` files (48 at `status: planned`, 2
further `split` into 4 group files each independently `planned`).

## Feature Backlog
0 backlogged · 0 planned · 0 tasked · 32 implemented — see
`.project/features/`. `sync-tabs-to-real-audio` has advanced from
`tasked` to `implemented` now that
`tasks-recording-drift-foundation-cc87.md` is complete and merged. No
feature carries a non-empty `epic` — by-epic breakdown omitted.

## Documented but Untracked
None found — every capability described by a stable artifact traces to
either a feature-register entry or existing, working code.

## Orphaned Completion Flips
None found — `completion-flip-check.sh` ran clean against
`tasks-recording-drift-foundation-cc87.md` (and all other
`status: completed` tasks files): the register already correctly reads
`sync-tabs-to-real-audio: implemented`, no stale `tasked` entry left
behind.

## Work Queue
None — no `ready`-status tasks file exists project-wide.

## In Flight
- `tasks-lobby-cursor-modes-0bea.md` — in-progress, 11/12 (unrelated
  branch, untouched by this merge).
- No other worktrees (`inflight-worktrees.sh` empty), no
  `parallel-matrix.sh` entries, no `worktree-reap.sh --dry-run`
  candidates. ArDD install up to date at `9bc9b38fa85` (beta channel).

## Summary
0 issues found. Safe to /plan: yes. Recommended next step: pick the next
feature to work — with the register at 0 backlogged/planned/tasked and
32 implemented, there is no queued feature; use `/ardd-backlog` to log a
new idea or `/ardd-feedback` review to pull the next actionable item from
the 48 `planned` feedback files.

_Updated: 2026-07-24 (**Ran `/ardd-status`: full cross-artifact consistency
check after `/ardd-refine infrastructure` resolved the synth-path
output-latency `[OPEN: ...]` question (decided: instrumented `AudioContext`
anchor), no other state changes.** Artifacts (6, all `status: stable` except
`constitution.md` v1.6.2 which has no `status` field by convention):
`brand.md`, `constitution.md`, `datamodel.md`, `infrastructure.md`,
`pipeline.md`, `ui.md` — all read in full.

## Artifacts Found
- brand.md — stable ✅
- constitution.md — stable ✅ (v1.6.2, `next_step_prompt: auto`)
- datamodel.md — stable ✅
- infrastructure.md — stable ✅ (`last_updated: 2026-07-24`)
- pipeline.md — stable ✅
- ui.md — stable ✅

## Cross-Artifact Issues
None found. infrastructure.md's newly-decided output-latency anchor
(instrumented `AudioContext`, compared against alphaTab's scheduled
note-on tick) is consistent with datamodel.md's `PlaybackState.tickPosition`
notes and ui.md's recording-mode carve-out language — no field/endpoint
referenced in one artifact and left undefined in another.

## Within-Artifact Issues
No unresolved `[OPEN: ...]` placeholders or TODOs found in any artifact
(confirmed by direct grep across `.project/artifacts/*.md`) — the prior
run's one open item (infrastructure.md line 141, synth output latency) is
now resolved and reads as a decision ("Decided: an instrumented
`AudioContext` anchor...") rather than a question. No draft-status
artifacts blocking planning.

## Constitution Compliance
No violations found. Production Annotations (datamodel.md's placeholder
ToS version, infrastructure.md's out-of-band datastore/secrets and
hand-rolled OAuth) remain correctly flagged as annotated shortcuts, not
silent gaps.

## Diagrams
- datamodel.md — current ✅
- infrastructure.md — **stale ⚠️ (run `/ardd-diagram infrastructure`)** —
  frontmatter's `diagram_status: stale` correctly reflects that this
  artifact's content changed (the output-latency resolution above,
  `last_updated: 2026-07-24`) since the diagram was last generated.
- ui.md — current ✅

## Code-vs-Artifact Defects
0 known defects — see `DEFECTS.md`, last checked 2026-07-23 (all 3
previously-recorded defects confirmed closed). Run `/ardd-defects` to
refresh if code has changed since.

## Feedback
No open-feedback section — 0 files at `status: open` across 50
`.project/feedback/feedback-*.md` files (48 already advanced to
`status: planned`, 2 further `split` into 4 group files each independently
`planned`).

## Feature Backlog
0 backlogged · 0 planned · 1 tasked · 31 implemented — see
`.project/features/`. The 1 tasked entry (`sync-tabs-to-real-audio`) is
correctly bound to `plan-recording-drift-foundation-2026-07-20-9ca3.md` /
`tasks-recording-drift-foundation-cc87.md`, both in progress. No feature
carries a non-empty `epic` — by-epic breakdown omitted.

## Documented but Untracked
None found — every capability described by a stable artifact traces to
either a feature-register entry or existing, working code.

## Orphaned Completion Flips
None found — `completion-flip-check.sh` ran clean against all 63
`status: completed` tasks files (2 `abandoned`: `tasks-99e6-e76f.md`,
`tasks-sync-tabs-to-real-audio-cb85.md`; 2 `in-progress`, correctly
excluded from the completed-set check:
`tasks-recording-drift-foundation-cc87.md`,
`tasks-lobby-cursor-modes-0bea.md`).

## Work Queue
None — no `ready`-status tasks file exists project-wide.

## In Flight
- `tasks-recording-drift-foundation-cc87.md` (plan
  `plan-recording-drift-foundation-2026-07-20-9ca3.md`, branch
  `recording-drift-foundation`) — in-progress, 20/22 (Phase 1 diagnosis
  substantially done; the just-resolved output-latency decision unblocks
  continued work here).
- `tasks-lobby-cursor-modes-0bea.md` — in-progress, 11/12.
- No other worktrees (`inflight-worktrees.sh` empty), no
  `parallel-matrix.sh` entries, no `worktree-reap.sh --dry-run`
  candidates. ArDD install up to date at `9bc9b38fa85` (beta channel).

## Summary
1 issue found (infrastructure.md's diagram is stale, expected side effect
of the just-completed refine). Safe to /plan: yes. Recommended next step:
`/ardd-diagram infrastructure` to regenerate the diagram from the
refined content, then resume `tasks-recording-drift-foundation-cc87.md`
now that its blocking open question is decided.

--- Artifacts (6, all `status: stable` except
`constitution.md` v1.6.2 which has no `status` field by convention):
`brand.md`, `constitution.md`, `datamodel.md`, `infrastructure.md`,
`pipeline.md`, `ui.md` — all read in full. One unresolved `[OPEN: ...]`
placeholder found, in `infrastructure.md` (line 141): establishing the
synth playback path's own output latency, which alphaTab 1.8.3 doesn't
expose — needs an external reference (loopback capture or instrumented
`AudioContext` anchor) or an explicit decision to proceed without it; this
is the acknowledged open question behind the in-progress
`tasks-recording-drift-foundation-cc87.md` work, not a newly-discovered
gap. No other `[OPEN: ...]` markers, TODOs, or draft-status artifacts.
Diagram frontmatter for `datamodel.md`/`infrastructure.md`/`ui.md` all
`diagram_status: current` (regenerated last session, `769d2dd`). No
cross-artifact contradictions found (entities/fields/endpoints referenced
across datamodel/infrastructure/ui/pipeline line up). No constitution
violations found; no `workflow_mode: collaborative` set, so PR-draft check
skipped.

`DEFECTS.md` last verified 2026-07-23: all-clear, 0 open defects (3
previously-recorded defects confirmed closed by direct inspection).
Feedback: 50 files under `.project/feedback/`, 0 at `status: open` — 48
already advanced to `status: planned` (2 of those split into 4 group
files, tracked as `open -> split -> planned` per-group) and consumed by
their respective plans; no unaddressed feedback backlog. Feature register:
32 entries in `.project/features/`, 31 `implemented`, 1 `tasked`
(`sync-tabs-to-real-audio`, correctly bound to
`plan-recording-drift-foundation-2026-07-20-9ca3.md` /
`tasks-recording-drift-foundation-cc87.md`, both in progress) — 0
`backlogged`/`planned`, so no epic grouping applies (no feature carries a
non-empty `epic` field either). Documented-but-untracked: none found —
every capability described by a stable artifact traces to either a
feature-register entry or existing, working code (consistent with
`DEFECTS.md`'s same finding one day prior).

Completion-flip check: ran
`.claude/skills/ardd-scripts/completion-flip-check.sh` against all 63
`status: completed` tasks files (2 `abandoned`:
`tasks-99e6-e76f.md`, `tasks-sync-tabs-to-real-audio-cb85.md`; 2
`in-progress`: `tasks-recording-drift-foundation-cc87.md`,
`tasks-lobby-cursor-modes-0bea.md` — correctly excluded from the
completed-set check). Zero flip candidates found — no orphaned
completions needing user confirmation.

In Flight: zero other worktrees (`inflight-worktrees.sh` empty), zero
parallel-matrix entries, zero worktree-reap candidates. On `main`:
`tasks-recording-drift-foundation-cc87.md` unchanged at 20/22
(in-progress — Phase 1 diagnosis substantially done, gated on the
infrastructure.md `[OPEN: ...]` above); `tasks-lobby-cursor-modes-0bea.md`
unchanged at 11/12 (in-progress). ArDD install up to date at `9bc9b38`
(beta channel).

Work Queue: none — no open feedback, no backlogged/planned features, no
recorded defects. The only outstanding item project-wide is the two
in-progress tasks files above, both already mid-execution on `main`.

Summary: project is healthy. 0 issues found (no cross-artifact
contradictions, no constitution violations, no orphaned completion
flips, no documented-but-untracked capabilities). Safe to /plan: yes —
though there is little to plan given zero backlog; the natural next
action is resuming/closing out the two in-progress tasks files, in
particular resolving `infrastructure.md`'s open synth-latency question
so `tasks-recording-drift-foundation-cc87.md` can proceed past its
current gate. Recommended next step: continue
`tasks-recording-drift-foundation-cc87.md` (resolve the synth
output-latency `[OPEN: ...]` first) or `tasks-lobby-cursor-modes-0bea.md`
— both are the only non-clean state in the project; no `/ardd-status`
follow-up action is required beyond this.**)_

_Updated: 2026-07-24 (**Ran `/ardd-diagram` for all 3 renderable
artifacts.** Regenerated `datamodel.md`'s `erDiagram`, `infrastructure.md`'s
and `ui.md`'s `graph TD` diagrams, upserted into `README.md`'s
Datamodel/Infrastructure/UI sections. Datamodel: added
`Session.hostBarsPerRow`/`earlyStopTick`, noted `Participant.displayName`
is now reject-validated. Infrastructure: added a `VALIDATE` node
(`input-validation.ts`) between `WSS` and `DISPATCH`, a new `AUTHOR` node
(`catalogue-authoring-routes.ts` + `song-upload-route.ts`), annotated
`DISPATCH` with `bars-per-row-set`/`early-stop-set`/Start Negotiation
auto-resolve. UI: added the Help/Info/About panel, join-code click-to-copy
and remembered-name pre-fill noted inline, Session-tab bars-per-row/
early-stop controls, Preferences-tab bars-per-row preference, early-stop
de-emphasis on Playback View. All three artifacts stamped
`diagram_status: current`. Committed `769d2dd`. This was the last
remaining loose end from this session's three merged bundles — no other
state changed. Zero in-flight worktrees, zero open feedback, zero
backlogged features, zero known defects (DEFECTS.md still all-clear from
the prior pass). `tasks-recording-drift-foundation-cc87.md` unchanged at
20/22 (in-progress, on main); `tasks-lobby-cursor-modes-0bea.md` unchanged
at 11/12. ArDD up to date at `9bc9b38` (beta). Recommended next step: none
— project is in a fully clean, all-diagrams-current, all-defects-closed
state.**)_

_Updated: 2026-07-23 (**Ran `/ardd-defects`: full survey confirming all 3
known defects are closed.** Direct re-inspection: `scriptFile` citation is
correctly `client/src/tab-renderer.ts:84`; `bars-per-row-set`/
`early-stop-set` field names correctly `barsPerRow`/`tickPosition`; and
`input-validation.ts` genuinely rejects (not sanitizes) invalid input at
all three call sites. No new defects found in this session's third
merged bundle (join-code format enforcement, Phase 2 authoring field
validation, client-side `TextInput.svelte` checks) — all consistent with
artifact claims or correctly scoped as undocumented internal hardening.
`DEFECTS.md` regenerated to its all-clear state (`cfcf072`). Diagram
status for `datamodel.md`/`infrastructure.md`/`ui.md` remains `stale`
(content changed across three merged bundles this session, diagrams never
regenerated) — the only loose end left standing. Zero in-flight
worktrees, zero open feedback, zero backlogged features.
`tasks-recording-drift-foundation-cc87.md` unchanged at 20/22
(in-progress, on main); `tasks-lobby-cursor-modes-0bea.md` unchanged at
11/12. ArDD up to date at `9bc9b38` (beta). Recommended next step: run
`/ardd-diagram` for `datamodel`, `infrastructure`, and `ui` to regenerate
the 3 stale diagrams — the only remaining cleanup item; nothing else
urgent.**)_

_Updated: 2026-07-23 (**`tasks-input-validation-e2e-hardening-e2da.md`
completed and merged (all 17 tasks, 6 phases).** Delivered:
`input-validation.ts` now actually rejects invalid `displayName`/
activation-key input (a `ValidationResult` discriminated union) instead
of silently sanitizing, wired through `session-create`/`session-join`/
`catalogue-unlock`; matching non-authoritative client-side validation on
Landing's name input and the activation-key field (new
`client/src/input-validation.ts`, a new `error`/`onblur` pair on
`TextInput.svelte`); join-code format grounded in `session-store.ts`'s
actual 4-char generator alphabet and enforced at both layers; a
generalized `validateField` helper applied to Phase 2 in-app authoring's
catalogue-creation (`slug`/`name`/`key`) and add-song (`artist`/`title`/
`submitterName`) fields at both layers — closing the real gap where
`artist`/`title` fed `buildStagedFilename`'s filesystem path construction
unvalidated; and the remaining 6 e2e specs' `.first()`-based fixture song
selection fixed. Test suites: server 318/318, client vitest 153/153,
client CT 229/230 (1 pre-existing unrelated flake, unchanged from prior
passes), e2e 18/21 on the 6 fixed specs (3 pre-existing unrelated
failures — a strict-mode spinbutton violation from unrelated in-flight
work, a hazard-bar overlay issue, a fixture-data limitation — none caused
by this work). Merged `worktree-agent-a18196966954993db` into `main` at
`e0c5915` — clean, no conflicts (unlike the two earlier merges this
session, this one needed no manual resolution and no dist rebuild). Both
source feedback items already flipped to `status: planned` at plan time;
no bound features to flip (`features: []`). `DEFECTS.md`'s remaining
broken-contract entry (invalid input silently sanitized) is now resolved
in code — will confirm and drop on the next `/ardd-defects` run.

Zero in-flight worktrees, zero open feedback, zero unsurfaced defects,
zero backlogged features. `tasks-recording-drift-foundation-cc87.md`
unchanged at 20/22 (in-progress, on main); `tasks-lobby-cursor-modes-0bea.md`
unchanged at 11/12. ArDD up to date at `9bc9b38` (beta). Recommended next
step: `/ardd-defects` to confirm the broken-contract defect and the 2
already-fixed cosmetic ones are all closed, and refresh `DEFECTS.md`.**)_

_Updated: 2026-07-23 (**Ran `/ardd-plan` against both open feedback files**
(`feedback-e2e-fixture-song-selection-drift-60d7.md`,
`feedback-input-validation-reject-and-defense-in-depth-fc7d.md`) plus the
2 unsurfaced defects (`0b8dc7ed`, `59b17701`) — declined both defects as
bookkeeping (already fixed in docs / duplicated by this plan's own F001),
still recorded in `surfaced-defects:` so they won't re-prompt. No artifact
edits needed — `infrastructure.md`'s Input Validation section already
documented the correct (reject) behavior; the gap is in code. **Scope
correction caught mid-draft**: initially scoped Phase 2 in-app authoring's
input fields (catalogue `slug`/`name`/`key`, song `artist`/`title`/
`submitterName`) as out-of-scope, assuming that feature was future/
CLI-only — a quick grep found `phase-2-in-app-authoring` is actually
`status: implemented` with a real `AuthoringModal.svelte` UI and zero
validation on any of those fields (one of them, `artist`/`title`,
currently feeds `buildStagedFilename()`'s filesystem path construction
unvalidated) — brought back into scope before drafting the phase
breakdown. Wrote and approved
`plan-input-validation-e2e-hardening-2026-07-23-61c0.md` (no bound
features) and generated `tasks-input-validation-e2e-hardening-e2da.md` (17
tasks, 6 phases, `status: ready`) — inline, not yet delegated. Both
feedback files flipped to `status: planned`. Feature backlog unchanged: 0
backlogged · 0 planned · 1 tasked · 31 implemented. Zero in-flight
worktrees. `tasks-recording-drift-foundation-cc87.md` unchanged at 20/22
(in-progress, on main); `tasks-lobby-cursor-modes-0bea.md` unchanged at
11/12. Recommended next step: `/ardd-implement` to execute
`tasks-input-validation-e2e-hardening-e2da.md`.**)_

_Updated: 2026-07-23 (**Filed 2 new feedback items via `/ardd-feedback`:
`feedback-input-validation-reject-and-defense-in-depth-fc7d.md` F001 (Bug,
`[artifacts: infrastructure]`) — fix `input-validation.ts` to actually
reject invalid `displayName`/activation-key input rather than silently
sanitizing, per the `/ardd-refine`-confirmed intended contract; and F002
(Bug, `[artifacts: infrastructure, ui]`) — a defense-in-depth requirement
that every user-input surface validate/sanitize at both client and server
layers, server never trusting client-side validation alone. Grounded by a
quick audit: `displayName`'s Landing View input currently has **no
client-side validation at all**; scoped to also cover the join-code field,
activation-key field, and Phase 2 authoring's catalogue name/key,
submitter identifier, and co-owner invite fields. Open feedback count now
3 (up from 1) — the pre-existing `feedback-e2e-fixture-song-selection-
drift-60d7.md` is unchanged. No other state changed this pass. Zero
in-flight worktrees. `tasks-recording-drift-foundation-cc87.md` unchanged
at 20/22 (in-progress, on main); `tasks-lobby-cursor-modes-0bea.md`
unchanged at 11/12. Recommended next step: `/ardd-plan` to bundle both new
feedback items (they overlap — F001 is the concrete first instance of
F002's broader audit) — not urgent.**)_

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
- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅

## Code-vs-Artifact Defects
- 0 known defects — see DEFECTS.md, last checked 2026-07-23. All-clear: all 3 prior defects confirmed closed by direct re-inspection.

## Feature Backlog
- 0 backlogged · 0 planned · 1 tasked · 31 implemented — see `.project/features/`.

## In Flight
- `tasks-recording-drift-foundation-cc87.md` — in-progress, 20/22 (on main).
- `tasks-lobby-cursor-modes-0bea.md` — in-progress, 11/12.

## Summary
0 cross-artifact/constitution issues found. Safe to /plan: yes. Recommended next step: none — project is in a fully clean state.

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
