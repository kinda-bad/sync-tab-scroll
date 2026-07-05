# sync-tab-scroll — Project Status

_Updated: 2026-07-04 (all four outstanding branches now merged to `main`: `worktree-agent-a3742a2bf2ac7cfe1`, `worktree-ui-improvements`, `lyrics-only-view-fix`, and `server-failure-banner` — every previously-open feedback item is now resolved (0 open). Each merge was gated on the full suite (typecheck, vitest, CT, e2e), not just typecheck; the last one (`server-failure-banner`) added `ClientState.connectionStatus` alongside the two already-merged branches' own additions to that type (`trackIndex`/`score`/`engineReady`/metronome preference), so conflicts there were purely mechanical field-combining, plus two sites (`leave-session.ts`/`.test.ts`) that predated the new required field entirely — both fixed. `server-failure-banner`'s own subagent stalled silently mid-T008 (no live process, no completion notification, ~2h+ inactivity) — its remaining work (T008-T010: artifact docs + full verification) was finished directly rather than waiting further. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | 0 |
| datamodel.md | draft ⚠️ | 3 |
| pipeline.md | stable ✅ | 0 |
| infrastructure.md | stable ✅ | 0 |
| ui.md | stable ✅ | 0 |
| brand.md | stable ✅ | 0 |
| features.md | — | 0 |

## Open Questions

### datamodel.md
- Per-song vs. per-submitter consent recording (Consent Record section) —
  resolved for `consented-song-submission` as per-song; revisit only if
  re-recording consent per song becomes real friction for a repeat
  submitter.
- CLI drop-in vs. web upload form for submission — resolved as CLI,
  matching the pipeline's existing operator-driven model.
- Real ToS legal text — not a design decision; a placeholder/dev value is
  used (`record-consent`'s `tosVersion`, production-annotated) until an
  operator supplies real text.

These are documented defaults, not blockers.

## Cross-Artifact Issues

- [MINOR] `features.md`'s "Metronome toggle" entry (logged 2026-07-02)
  still describes the original host-controlled `Session.metronomeEnabled`
  design, now superseded by the personal per-participant preference
  (`client/src/metronome-preference.ts`). `features.md` is owned by
  `/ardd-feature`/`/ardd-plan`/`/ardd-tasks`/`/ardd-implement`/
  `/ardd-converge`, not this skill — flagged for a future pass rather than
  edited here.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)

## Constitution Compliance

No violations found this pass. Principle VII (test-first) upheld
throughout all four branches merged this session. Principle III (one
connection entry point) upheld by `server-failure-banner`'s reconnect
mechanism, which reuses the existing reconnect-by-participantId path
(`session-join.ts`) rather than adding a second reattachment mechanism.

Principle VIII (Config via `.env`, Synced by Example) remains implemented
and merged (`config-env-convention`) — see `DEFECTS.md` for the one open,
explicitly-deferred item (CI provider decision).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-04 (scoped to
Principle VIII and this session's `infrastructure.md`/`ui.md` sections;
a full unscoped `/ardd-verify` pass is recommended soon given how much has
landed on `main` this session). The defect: Principle VIII's "run ... in
CI" half is unmet — no CI provider/workflow/remote exists in this repo —
an explicitly deferred human decision, not a silent gap.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 8 implemented — see
`.project/artifacts/features.md`. `participant-selected-part` (participant
list shows each member's currently selected part) remains backlogged —
target it with `/ardd-plan participant-selected-part` when ready.

## Plans — all merged to `main`, 2026-07-04

- **`plan-worktree-ui-improvements-2026-07-04.md`** (14/14 tasks): phone-
  viewport support, Settings modal restructured into Participants/Session/
  Preferences tabs, metronome moved to a personal per-participant
  preference. Superseded `plan-settings-modal-followup-2026-07-04.md`.
- **Work on branch `worktree-agent-a3742a2bf2ac7cfe1`** (no separate plan
  file): leave-session control, self-heal invisible-render race, debounced
  lobby-cursor/seek broadcasts, centered pre-singing lyrics placeholder.
  Includes `plan-session-lifecycle-2026-07-04.md` and
  `plan-lobby-cursor-race-2026-07-04.md`, both completed.
- **`plan-lyrics-only-view-fix-2026-07-04.md`**: fixed the production-only
  missing-alphaTab-worker-asset bug that blocked all playback readiness
  (most visibly the lyrics-only view). Also corrected a long-standing
  wrong "Chrome autoplay policy" belief in this project's own e2e
  docs/tests.
- **`plan-server-failure-banner-2026-07-04.md`** (10/10 tasks): WS
  connection-status tracking, fixed-interval reconnect with session
  reattachment, persistent `ConnectionBanner`. T008-T010 (artifact docs +
  full verification) completed directly after the implementing subagent
  stalled silently mid-T008.

**`plan-lyrics-pre-singing-2026-07-04.md`** → `tasks-lyrics-pre-singing-e09e.md`
— `status: in-progress`, not part of this session's merges; check status
before assuming complete.

## Implementation Status

**All four outstanding branches are implemented and merged to `main`.**
No branches remain outstanding from this session's parallel work.

**Merge conflict resolution notes, 2026-07-04 (chronological):**
1. `worktree-agent-a3742a2bf2ac7cfe1` → `main`: `playback-engine.ts`
   conflicted (this branch had reverted the `switchTrack` part-switching
   fix, `106a323`, having forked before it landed) — resolved by keeping
   both the fix and this branch's `renderedWhileVisible` render-race fix.
   Also fixed a real bug the merge surfaced: the seek-broadcast listener
   lacked an `isReadyForPlayback` guard, so alphaTab's own internal
   `isSeek: true` position-reset was mistaken for a real host seek
   (reproduced identically on the source branch alone — not a merge
   regression).
2. `worktree-ui-improvements` → `main`: same `playback-engine.ts` pattern
   (this branch also reverted `switchTrack`, forked before it landed).
   `SettingsModal.svelte`/`ui.md` conflicts resolved by taking this
   branch's three-tab redesign as authoritative, per its own plan's
   explicit supersession note over the other branch's narrower fix. Also
   fixed two real pre-existing bugs: a stale hardcoded port and a stale
   manual-modal-close click in `e2e/small-screen.spec.ts` (forked before
   the port-separation and auto-close-on-part-select changes landed), and
   a stale `metronomeEnabled` field in `leave-session.test.ts`.
3. `lyrics-only-view-fix` → `main`: clean merge, no conflicts — this
   branch had already merged `main` (including merges 1-2) into itself
   mid-work.
4. `server-failure-banner` → `main`: never touched `playback-engine.ts`.
   Conflicts limited to `ClientState`'s shape (`connectionStatus` added in
   parallel with the two already-merged branches' own additions) — pure
   field-combining. Also fixed two sites predating `connectionStatus`
   entirely (`leave-session.ts`'s real reset-to-initial-shape call and its
   test).

Every merge was gated on the full suite (typecheck + vitest + Playwright
CT + Playwright e2e), not just typecheck, specifically to catch exactly
this kind of cross-branch interaction.

**Unsigned commits — needs attention before any push.** Every commit this
entire session (all branches, all merges) was made with `--no-gpg-sign`
(1Password locked throughout). Re-sign the full unsigned range before
pushing anything.

**Known stalled-agent incident, 2026-07-04.** The `server-failure-banner`
subagent silently stopped mid-T008 with no completion notification, no
live process, and ~2+ hours of inactivity before being noticed —
confirmed via its worktree's last commit/edit timestamps and `TaskOutput`
no longer recognizing its task ID. Its remaining work (T008-T010) was
straightforward to finish directly from its own uncommitted state; no
work was lost.

## Recommended Next Step

1. Manually validate the metronome-per-participant implementation in the
   running app (design confirmed by the user; implementation not yet
   exercised live).
2. Re-sign the full unsigned commit range before pushing anything to a
   remote.
3. Check on `plan-lyrics-pre-singing-2026-07-04.md`'s `in-progress` tasks
   — resume or verify status.
4. Decide the CI-provider question for constitution Principle VIII
   whenever a remote/CI system exists (see `DEFECTS.md`).
5. Run a full unscoped `/ardd-verify` pass — a lot has landed on `main`
   this session; the current `DEFECTS.md` is scoped narrowly.
6. Not blocking: `/ardd-render` the three artifacts marked stale above;
   clean up the now-fully-merged worktrees under `.claude/worktrees/` if
   no longer needed.
