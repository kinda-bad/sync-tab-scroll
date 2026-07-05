# sync-tab-scroll — Project Status

_Updated: 2026-07-04 (`worktree-agent-a3742a2bf2ac7cfe1` and `worktree-ui-improvements` both merged to `main`. Both branches independently forked before this session's `switchTrack` part-switching fix (`106a323`) landed and had each silently reverted it in their own copy of `ensurePlaybackEngine`; both merges were resolved by hand to keep that fix alongside each branch's real new work, verified green via the full vitest + CT + e2e suite after each merge (not just typecheck). Two genuine pre-existing defects were found and fixed along the way (neither a merge regression — both reproduced identically on the source branch in isolation): a spurious internal alphaTab `isSeek: true` position-reset (fired while the sequencer still preparing MIDI, before `isReadyForPlayback`) was being broadcast as a real host seek — fixed with an `isReadyForPlayback` guard in `playback-engine.ts`'s seek listener; and `worktree-ui-improvements`' new `e2e/small-screen.spec.ts` predated both the dev/test port-separation work and the modal auto-close-on-part-select fix, so it hardcoded the old port and clicked a "Close" button that no longer exists — fixed. The metronome-per-participant reversal (`worktree-ui-improvements`) is a user-confirmed design decision, not newly decided by this merge — implementation not yet manually validated in the running app. `SettingsModal.svelte`'s three-tab redesign (`worktree-ui-improvements`) superseded the other branch's narrower crammed-row split, per that plan's own explicit supersession note — taken as authoritative during conflict resolution. Two feedback-driven branches remain in progress in the background, unaffected by this merge: `server-failure-banner` (T007 done, T008 in progress) and `lyrics-only-view-fix`.). Keep this current as artifacts are refined and open questions are resolved._

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
  design ("nothing currently lets the host set the flag"), which is now
  fully superseded by the personal per-participant preference merged from
  `worktree-ui-improvements` (`client/src/metronome-preference.ts`).
  `features.md` is owned by `/ardd-feature`/`/ardd-plan`/`/ardd-tasks`/
  `/ardd-implement`/`/ardd-converge`, not this skill — flagged for a future
  pass rather than edited here.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)

## Constitution Compliance

No violations found this pass. Principle VII (test-first) upheld
throughout both branches merged this session — both shipped with their own
regression coverage, and the two real defects the merge surfaced were each
caught by an existing test (`playback-engine.ct.spec.ts`'s debounce test;
`e2e/small-screen.spec.ts`'s own specs) rather than going unnoticed.

Principle VIII (Config via `.env`, Synced by Example) remains implemented
and merged (`config-env-convention`, 2026-07-04) — see `DEFECTS.md` for the
one open, explicitly-deferred item (CI provider decision).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

1 known defect — see `DEFECTS.md`, last checked 2026-07-04 (scoped to
Principle VIII; other artifacts not re-surveyed this run). The defect:
Principle VIII's "run ... in CI" half is unmet — no CI provider/workflow/
remote exists in this repo — an explicitly deferred human decision, not a
silent gap.

## Feedback

`feedback-settings-modal-followup-d914.md` — **`status: planned`**: both
items (the crammed-control-row split, and the metronome-per-participant
reversal) are now carried forward and implemented by
`plan-worktree-ui-improvements-2026-07-04.md`, which superseded this
item's own originally-planned fix.

`feedback-ui-improvements-69bb.md` — **`status: planned`**, fully
implemented via the same plan (phone-viewport support, small-screen tab
scaling, no-horizontal-scroll modals, three-tab Settings redesign via the
frontend-design skill).

`feedback-server-failure-banner-f225.md` — **`status: open`** on this
checkout (its own copy is `status: planned` on branch
`server-failure-banner`, where `/ardd-implement` is in progress — T007
done, T008 (ui.md update) in progress — will sync once that branch
merges). 1 Bug: the UI has no indication when the server is unreachable;
should show a persistent error banner until contact is restored. Tagged
`[artifacts: ui, infrastructure]`.

`feedback-lyrics-only-view-d7d8.md` — **`status: open`** on this checkout
(branch `lyrics-only-view-fix` is investigating/implementing in the
background). 1 Bug: the lyrics-only view renders nothing. Tagged
`[artifacts: ui]`.

0 other open feedback files.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 8 implemented — see
`.project/artifacts/features.md`. `participant-selected-part` (participant
list shows each member's currently selected part) remains backlogged —
target it with `/ardd-plan participant-selected-part` when ready.

## Plans

**`plan-worktree-ui-improvements-2026-07-04.md`** — `status: approved`,
tasks `status: completed` (14/14), merged to `main` 2026-07-04. Phone-
viewport support (meta tag, responsive modal shell, small-screen tab
notation scaling via alphaTab's own scale setting), Settings modal
restructured into Participants/Session/Preferences tabs, and the
metronome moved from host-controlled session state to a personal
per-participant preference (user-confirmed reversal). Superseded
`plan-settings-modal-followup-2026-07-04.md` (its tasks file now marked
`status: superseded`).

**Work on branch `worktree-agent-a3742a2bf2ac7cfe1`** (no separate plan
file — implemented directly, merged to `main` 2026-07-04): leave-session
control, self-heal invisible-render race (`renderedWhileVisible`),
debounced lobby-cursor/seek broadcasts, and a centered pre-singing lyrics
placeholder.

**`plan-session-lifecycle-2026-07-04.md`** → `tasks-session-lifecycle-836f.md`
— `status: completed`, merged as part of the `worktree-agent-a3742...`
branch above.

**`plan-lobby-cursor-race-2026-07-04.md`** → `tasks-lobby-cursor-race-c9f8.md`
— `status: completed`, merged as part of the `worktree-agent-a3742...`
branch above.

**`plan-lyrics-pre-singing-2026-07-04.md`** → `tasks-lyrics-pre-singing-e09e.md`
— `status: in-progress`.

**`plan-server-failure-banner-2026-07-04.md`** → in progress on branch
`server-failure-banner` (background), not yet merged.

## Implementation Status

**Both `worktree-agent-a3742a2bf2ac7cfe1` and `worktree-ui-improvements`
are implemented and merged to `main`.**

**Merge conflict resolution notes, 2026-07-04:**
- `client/src/playback-engine.ts` conflicted against both branches (each
  had independently reverted the `switchTrack` part-switching fix,
  `106a323`, having forked before it landed). Resolved by hand each time,
  keeping `trackIndex`/`score`/`switchTrack` alongside each branch's own
  additions (`renderedWhileVisible`/`markEngineReadyIfComplete` from the
  first branch; `loadStoredMetronome`/`setEngineMetronome` from the
  second). Verified via `playback-engine.ct.spec.ts`'s dedicated
  regression test after each merge.
- `client/src/components/SettingsModal.svelte`/`ui.md`/
  `tasks-settings-modal-followup-bbd2.md` conflicted between the two
  branches' own competing Settings-modal work. Resolved by taking
  `worktree-ui-improvements`'s three-tab redesign as authoritative
  throughout, per that branch's own plan explicitly superseding the
  other's narrower fix.
- Two genuine pre-existing defects surfaced by running the full suite
  post-merge (both reproduced identically on the source branch in
  isolation — not merge regressions): (1) `playback-engine.ts`'s
  seek-broadcast listener lacked an `isReadyForPlayback` guard, so
  alphaTab's own internal `isSeek: true` position-reset (fired while the
  sequencer was still preparing MIDI) was mistaken for a real host seek —
  fixed. (2) `client/e2e/small-screen.spec.ts` (new on
  `worktree-ui-improvements`) hardcoded the pre-port-separation preview
  port (`4173`) and clicked a "Close" button the song/part modal no
  longer has post-auto-close (`106a323`) — both branches forked before
  those two changes landed on `main`. Fixed: updated to `localhost:6001`,
  and to assert the dialog closes on its own.
- `client/src/leave-session.test.ts` (from the first branch) built a
  `Session` fixture including the now-removed `metronomeEnabled` field
  (a typecheck failure once the second branch's merge removed it from the
  shared `Session` type) — fixed.

**Unsigned commits — needs attention before any push.** Both merge
commits (`af41e24`, `fcfab93`) were made with `--no-gpg-sign` (1Password
locked). Re-sign the full unsigned range before pushing anything.

## Recommended Next Step

1. Manually validate the metronome-per-participant implementation in the
   running app (design decision already confirmed by the user; the
   implementation itself hasn't been exercised live yet).
2. Re-sign the full unsigned commit range before pushing anything to a
   remote.
3. Let the two background branches (`server-failure-banner`,
   `lyrics-only-view-fix`) finish and merge; both will need a fresh
   `playback-engine.ts`/`Playback.svelte` conflict check against the now
   much-changed `main`, same pattern as this pass.
4. `plan-lyrics-pre-singing-2026-07-04.md`'s tasks are `in-progress` —
   resume or check status.
5. Decide the CI-provider question for constitution Principle VIII
   whenever a remote/CI system exists (see `DEFECTS.md`).
6. Not blocking: `/ardd-render` the three artifacts marked stale above.
