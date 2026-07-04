# sync-tab-scroll — Project Status

_Updated: 2026-07-04 (this worktree: 3 of 4 tasks files fully implemented and committed — session-lifecycle, lobby-cursor-race, settings-modal-followup; lyrics-pre-singing 8/9 done, one live-browser check blocked by a fixture-catalog gap. 1 feedback item — metronome-per-participant — still awaiting the user's go/no-go). Keep this current as artifacts are refined and open questions are resolved._

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

These are documented defaults, not blockers — `consented-song-submission`
is fully implemented and merged with all three resolved as above.

## Cross-Artifact Issues

None found this pass. All five features merged this session
(`host-delegation`, `request-to-become-host`, `metronome-toggle`,
`count-in-toggle`, `consented-song-submission`) are consistently named
and cross-referenced across `datamodel.md`, `infrastructure.md`, and
`ui.md`.

## Within-Artifact Issues

### datamodel.md
- [OPEN] Per-song vs. per-submitter consent (see above)
- [OPEN] CLI drop-in vs. web upload form (see above)
- [OPEN] Real ToS legal text (see above)

## Constitution Compliance

No violations. Principle II (No Dead Architecture): the
`host-delegation`/`request-to-become-host` merge reused one shared
`transferHost()` helper across `host-succession.ts`'s existing promotion
and the new `host-delegate` handler, rather than the three independent
copies the two originally-parallel plans would have produced — this was
the specific defect the `host-transfer` reconciliation existed to
prevent, and it held up: a single implementation of the field swap.
Principle VII (test-first) upheld throughout all three newly-merged
features.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-render infrastructure`)
- ui.md — stale ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

0 known defects — see `DEFECTS.md`, last checked 2026-07-03. All-clear:
the 3 `ui.md` defects surfaced by the post-merge `/ardd-verify` pass (a
dropped "connected" precondition on "Make host", and two paragraph-order/
phrasing mismatches, all from manually resolving the `host-transfer` ↔
`metronome-count-in-toggle` merge conflict) are fixed — the Participants
tab bullet now matches `SettingsModal.svelte`'s actual render order and
behavior exactly.

## Feedback

`feedback-manual-verification-pass-4b3c.md` (`status: split`, 2026-07-04)
was split into 4 group-specific files for parallel planning; all 4 are now
implemented (in this worktree, `worktree-agent-a3742a2bf2ac7cfe1`):
- `feedback-session-lifecycle-6876.md` — planned, → `plan-session-lifecycle-2026-07-04.md` → `tasks-session-lifecycle-836f.md` (**completed**)
- `feedback-lobby-cursor-race-4262.md` — planned, → `plan-lobby-cursor-race-2026-07-04.md` → `tasks-lobby-cursor-race-c9f8.md` (**completed**)
- `feedback-lyrics-pre-singing-1fa6.md` — planned, → `plan-lyrics-pre-singing-2026-07-04.md` → `tasks-lyrics-pre-singing-e09e.md` (**in-progress, 8/9** — T008 live-browser confirmation blocked, see Implementation Status below)
- `feedback-settings-modal-followup-d914.md` — **still `status: open`**: its
  layout-regroup item is planned/tasked/**implemented** (→ `plan-settings-modal-followup-2026-07-04.md`
  → `tasks-settings-modal-followup-bbd2.md`, **completed**), but its Reconsidered
  item (metronome per-participant vs. host-controlled) is deliberately
  unresolved pending the user's explicit confirmation — it would reverse
  documented decisions in `datamodel.md`/`ui.md`. Not blocking the rest of
  that plan's work.

0 other open feedback files (`feedback-hazard-bar-progress-4925.md`,
`feedback-lobby-cursor-mode-e13b.md`, `feedback-lyrics-ticker-bfd9.md`,
`feedback-playback-sync-f03d.md`, `feedback-session-create-selection-0411.md`,
`feedback-settings-modal-redesign-7e73.md`, `feedback-theme-persistence-bed6.md`,
`feedback-ui-polish-pass-e180.md` are all already `status: planned` from
earlier sessions).

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 8 implemented
(`test-coverage-backfill`, `playwright-client-coverage`,
`host-delegation`, `request-to-become-host`, `metronome-toggle`,
`count-in-toggle`, `consented-song-submission`) — see
`.project/artifacts/features.md`. Every feature logged to date is now
implemented.

## Plans

Plans from the prior (2026-07-03) session are all implemented and merged
to `main`: `plan-fix-lyric-css-colors-dead-code-2026-07-03.md`,
`plan-metronome-count-in-toggle-2026-07-03.md`,
`plan-consented-song-submission-2026-07-03.md`, and
`plan-host-transfer-2026-07-03.md` (which reconciled and superseded
`plan-host-delegation-2026-07-03.md` and
`plan-request-to-become-host-2026-07-03.md` — both still on disk marked
`superseded`, kept as historical record on their own now-fully-merged
branches).

**4 plans from 2026-07-04, all `status: approved`, all implemented in
worktree `worktree-agent-a3742a2bf2ac7cfe1`** (not yet merged to `main` —
awaiting review): `plan-session-lifecycle-2026-07-04.md`,
`plan-lobby-cursor-race-2026-07-04.md`, `plan-lyrics-pre-singing-2026-07-04.md`,
`plan-settings-modal-followup-2026-07-04.md`. Each was independently
reviewed by a background agent against the live codebase (not just its own
text) before approval — see each plan's tasks file for verification notes
(e.g. `tasks-session-lifecycle-836f.md` confirmed a genuine `WsClient.close()`
gap; `tasks-lyrics-pre-singing-e09e.md` caught a test assertion that breaks
under the new design; `tasks-settings-modal-followup-bbd2.md` reordered a
phase to satisfy constitution Principle VII test-first).

## Implementation Status

**Worktree `worktree-agent-a3742a2bf2ac7cfe1` (branched from `main` @
`1c7eec8`), 2026-07-04 — 4 tasks files implemented, awaiting review/merge:**
- `tasks-session-lifecycle-836f.md` — **completed** (11/11). Commits:
  `9badada` (T001-T006, Leave-session control), `40345fe` (T007-T011,
  self-healing invisible-render fix + Playback loading indicator).
- `tasks-lobby-cursor-race-c9f8.md` — **completed** (6/6). Commits:
  `4f996f3` (T001-T005, debounce helper + both send sites), `9932cb0`
  (T006, live two-participant verification notes).
- `tasks-settings-modal-followup-bbd2.md` — **completed** (6/6). Commit:
  `e4467ad`.
- `tasks-lyrics-pre-singing-e09e.md` — **in-progress, 8/9**. Commit:
  `e1f6d5a` (T001-T007, T009). T008 (live-browser confirmation of the
  centered "…" placeholder) not done: the committed test-fixture catalog
  (`client/test-fixtures/fixture-catalog`) has no lyrics wired
  (`lyricsTrackIndex: null`), so the lyrics-overlay code path never
  activates against it — needs the real (gitignored) catalog, which
  belongs to a different, concurrently-running worktree/session. CT
  coverage (4/4 tests, including 2 new ones) exercises the exact same
  production code end-to-end against real DOM/CSS, but per this project's
  convention that's not conflated with an actual live-browser visual
  check.
- Regression: full client suite re-run clean at the end — 8 unit test
  files / 31 tests, 38 CT tests, all passing, no regressions across any
  of the 4 tasks files' combined changes. e2e not re-run in this worktree
  (a stale dev server from earlier manual verification work occupies port
  8080/4173 outside this worktree's control — environment artifact, not a
  code issue; see `tasks-session-lifecycle-836f.md` T011 for the same
  finding).
- **Note on the count-in fix's own tasks file**: `tasks-metronome-count-in-toggle-eb7d.md`
  and `tasks-playback-sync-fixes-0fec.md` (the `correctDrift` host-echo
  fix) were completed in the **main working directory**, not this
  worktree — already merged into the commit this worktree branched from
  (`1c7eec8`).

**All backlogged features from the 2026-07-03 session are implemented and
merged to `main`**: `fix-lyric-css-colors-dead-code`,
`add-typecheck-precommit-hook`, `metronome-count-in-toggle`,
`consented-song-submission`, `host-transfer` (covering both
`host-delegation` and `request-to-become-host`).

**Merge conflict resolution note** (`host-transfer` → `main`): as
anticipated when `host-transfer` and `metronome-count-in-toggle` were
run in parallel, both touched `packages/shared/src/messages.ts`,
`server/src/dispatch.ts`, and `client/src/components/SettingsModal.svelte`.
`messages.ts` and `dispatch.ts` auto-merged cleanly (pure additive
union/switch entries). `SettingsModal.svelte`'s markup also auto-merged
cleanly; only its `<script>` block's new function declarations needed a
one-line manual combine. The two branches' independently-created
`SettingsModal.ct.spec.ts` and `SettingsModalHarness.svelte` (add/add
conflict — both created the same new files) were manually reconciled:
unified on the props-based mount pattern (`host-transfer`'s harness
design, which avoids `page.evaluate` race conditions) and rewrote the
metronome/count-in tests to use it, keeping both test suites' full
coverage (9 component tests total) rather than dropping either side.

**Unsigned commits — needs attention before any push.** Every commit
across this entire session (all branches, all merges, including all 5
commits in this worktree) was made with `--no-gpg-sign` (1Password locked
throughout). Re-sign the full range once 1Password is available, before
pushing anything.

**Known unresolved from earlier work — updated 2026-07-04.** The user ran
a manual-verification pass and confirmed two of these directly:
`lyrics-ticker` T004 (centering) **failed** live — see that tasks file and
`feedback-manual-verification-pass-4b3c.md`. `lyrics-ticker` T007 (scroll
clearance) **failed then fixed and confirmed** — `padding-bottom` bumped
from `var(--lyrics-strip-height)` to `calc(var(--lyrics-strip-height) * 2)`
in `App.svelte`, user confirmed live 2026-07-04. `theme-persistence` T004
**passed** live, 2026-07-04. `metronome-count-in-toggle` T009 and
`playback-sync-fixes` T007 both **failed live then fixed**, 2026-07-04:
count-in caused playback to start at the correct tempo, then go
slow/janky once the countdown completed, with the metronome audibly
retriggering rapidly. Root cause, confirmed empirically via live
instrumentation (not guessed): `correctDrift()` (`client/src/playback-sync.ts`)
was drift-correcting the **host's own client** against an echo of its own
up-to-1s-stale tick-report — since the host's real position advances
continuously between reports, drift exceeded the 50-tick threshold almost
immediately every cycle, hard-resetting the host's own playback backward
tens of times/sec (measured: real tempo should be ~1888 ticks/sec at this
song's 118bpm; observed ~68 ticks/sec, ~3.6% of real speed, with ~86
seek-broadcasts/sec). Fixed: `correctDrift` now takes an `isHost` flag and
skips the tick-comparison drift-reset branch for the host entirely (still
gets start/pause status transitions); the seek-broadcast guard's
`lastProgrammaticTick` is now also updated synchronously before each
`tickPosition` assignment, closing a secondary race. Verified live
post-fix: host tick advances at exactly ~1888 ticks/sec with ~0.4
seeks/sec. Full writeup in `tasks-metronome-count-in-toggle-eb7d.md` T009
and `tasks-playback-sync-fixes-0fec.md` T007. The lyrics ticker's background
stacking/contrast bug (visible-but-wrong in light mode, invisible in dark
mode) is **fixed and confirmed live in both themes**, 2026-07-04: root
cause was alphaTab's own `.at-cursors` wrapper carrying an inline
`z-index: 1000`, which beat `.lyrics-overlay`'s `z-index: auto` regardless
of DOM order, plus a hardcoded near-black background indistinguishable
from `--canvas-bg` in dark mode specifically. Fixed in
`client/src/styles/motifs.css` (`.lyrics-overlay` now `z-index: 1001` and
a theme-aware `color-mix(..., var(--surface-raised) ...)` background);
this also required bumping `Modal.svelte`/`Toasts.svelte` from
`z-index: 200` to `1010` so they stay above alphaTab's layer too — see
`tasks-lyrics-ticker-75dd.md` for the full note. `hazard-bar-progress`
T006 is now corroborated by the user's own live pass, 2026-07-04 (hard to
isolate from the other concurrent bugs, but behaving more or less
correctly) — called good for now. All manual-verification markers this
session had known about are now either passed, or failed-then-fixed and
re-confirmed live.

## Recommended Next Step

1. Review and merge worktree `worktree-agent-a3742a2bf2ac7cfe1` into
   `main` — 3 of 4 tasks files fully completed, the 4th 8/9 done with one
   known, explained gap (T008 live-browser check, see Implementation
   Status). All tests pass (31 unit + 38 CT), typecheck clean.
2. After merging, do the one remaining live-browser check T008 needs
   (real catalog with a lyrics-bearing song, not the fixture) — confirm
   the centered "…" placeholder and its smooth transition to the first
   real syllable.
3. Decide the metronome-per-participant question (low priority, no rush) —
   see `feedback-settings-modal-followup-d914.md`'s Reconsidered item.
4. Re-sign the full unsigned commit range before pushing anything to a
   remote — every commit this entire session was made with
   `--no-gpg-sign` (1Password locked throughout), including this
   worktree's 5 commits.
5. Separately, not blocking: attempt the remaining outstanding
   live-browser checks listed above.
