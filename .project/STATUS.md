# sync-tab-scroll — Project Status

_Updated: 2026-07-04 (`config-env-convention` merged to `main`: Principle VIII implemented and verified — server/.env + server/.env.example, client/.env + client/.env.example, a test-first shape-lint script wired into pre-commit, both dev/test port schemes (6000/6001/6080/6081) confirmed unaffected, including the build-time `import.meta.env` port-baking path the principle's motivating bug hit; CI wiring flagged as an open human decision, no CI provider exists yet. New feedback logged: server-unreachable UI has no indication/banner — plan drafted (`plan-server-failure-banner-2026-07-04.md`, branch `server-failure-banner`), `/ardd-tasks` next. New backlog item logged: `participant-selected-part`. 4 other feedback-derived plans reviewed and task-generated in parallel by independent background agents; 1 feedback item — metronome-per-participant — still awaiting the user's go/no-go). Keep this current as artifacts are refined and open questions are resolved._

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

**Constitution amended to 1.4.0, 2026-07-04**: new Principle VIII (Config
via `.env`, Synced by Example) — app config read from a single git-ignored
`.env` per app, with a lint-enforced `.env.example` companion kept in
lockstep (same key shape), checked pre-commit and in CI. Motivated by a
real bug this session: `VITE_BACKEND_PORT=6081` prefixing only the
`build` half of a `build && preview` shell command left `preview` silently
using the wrong default. **Implemented and verified, 2026-07-04**
(`plan-config-env-convention-2026-07-04.md` /
`tasks-config-env-convention-9a7e.md`, branch `config-env-convention`, 14/14
tasks complete): `server/.env`/`server/.env.example` (`PORT`,
`CATALOG_ROOT`, `HOST_REASSIGN_GRACE_MS`, `REQUIRE_SONG_CONSENT`),
`client/.env`/`client/.env.example` (`VITE_BACKEND_PORT`), server config
loaded via Node's native `--env-file-if-exists` (no new dependency),
client's `vite.config.ts` proxy target loaded via Vite's `loadEnv()`
(imported from `vite`, not `vitest/config` — the latter doesn't re-export
it, caught by this work's own no-`.env` verification pass), and a
test-first `scripts/check-env-parity.mjs` wired into `.githooks/pre-commit`
via a new `pnpm check:env`. Both dev/test port schemes (6000/6001/6080/6081)
confirmed unaffected: full suite passes with no `.env` present (this
worktree's real state), and with `.env` populated (`PORT`/
`VITE_BACKEND_PORT=6080`) plus ambient dev servers already occupying
6000/6080, e2e still correctly targets 6081/6001 and passes. Critically,
also verified directly against a built bundle (`grep`-checked, not just
end-to-end-inferred) that a shell-set `VITE_BACKEND_PORT` still wins over
`.env` for the *baked* `ws://…` URL in `client/src/ws-client.ts` — the
exact `import.meta.env` mechanism the principle's motivating bug hit, which
the e2e run alone couldn't distinguish from a wrong-but-passing false
positive (a stray ambient server on the wrong port would have masked it).
**Not implemented, by explicit design deferral**: the "and in CI" half —
this repo has no CI provider, no `.github/workflows`, and no configured
remote; see `DEFECTS.md`'s constitution.md entry for the human decision
this needs, plus a noted design tension (the parity check is structurally
a no-op in CI regardless of provider, since `.env` is git-ignored and
absent there by design). Also noted in `DEFECTS.md`: `config.ts`'s inline
defaults are an intentional boot fallback, not scattered sourcing, but
duplicate the same default *values* as `.env.example` with no
value-level drift check (key-shape only) — acceptable at today's scale.
5 commits on this branch, all unsigned (`--no-gpg-sign`, 1Password locked)
— needs re-signing before push. Merged to `main` 2026-07-04; not pushed.

No other violations. Principle II (No Dead Architecture): the
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

1 known defect — see `DEFECTS.md`, last checked 2026-07-04 (scoped to
Principle VIII, per the config-env-convention work it was run to confirm;
other artifacts unchanged since the 2026-07-03 all-clear pass, not
re-surveyed this run). The defect: Principle VIII's "run ... in CI" half
is unmet — no CI provider/workflow/remote exists in this repo — an
explicitly deferred human decision, not a silent gap. Two further notes
recorded (not defects): the parity check is structurally a no-op in CI
regardless of provider (`.env` is git-ignored/absent there by design), and
`server/src/config.ts`'s inline defaults duplicate `.env.example`'s default
*values* with no value-level drift check (key-shape only) — acceptable at
today's scale.

## Feedback

`feedback-manual-verification-pass-4b3c.md` (`status: split`, 2026-07-04)
was split into 4 group-specific files for parallel planning, each
independently reviewed and approved this session:
- `feedback-session-lifecycle-6876.md` — planned, → `plan-session-lifecycle-2026-07-04.md` → `tasks-session-lifecycle-836f.md` (ready)
- `feedback-lobby-cursor-race-4262.md` — planned, → `plan-lobby-cursor-race-2026-07-04.md` → `tasks-lobby-cursor-race-c9f8.md` (ready)
- `feedback-lyrics-pre-singing-1fa6.md` — planned, → `plan-lyrics-pre-singing-2026-07-04.md` → `tasks-lyrics-pre-singing-e09e.md` (ready)
- `feedback-settings-modal-followup-d914.md` — **still `status: open`**: its
  layout-regroup item is planned/tasked (→ `plan-settings-modal-followup-2026-07-04.md`
  → `tasks-settings-modal-followup-bbd2.md`, ready), but its Reconsidered
  item (metronome per-participant vs. host-controlled) is deliberately
  unresolved pending the user's explicit confirmation — it would reverse
  documented decisions in `datamodel.md`/`ui.md`. Not blocking the rest of
  that plan's work.

`feedback-server-failure-banner-f225.md` — **`status: open`**, new this
pass: 1 Bug — the UI has no indication when the server is unreachable
(WS never connects, or drops with no server-side error message); should
show a persistent error banner until contact is restored. Tagged
`[artifacts: ui, infrastructure]`. Not yet planned.

0 other open feedback files (`feedback-hazard-bar-progress-4925.md`,
`feedback-lobby-cursor-mode-e13b.md`, `feedback-lyrics-ticker-bfd9.md`,
`feedback-playback-sync-f03d.md`, `feedback-session-create-selection-0411.md`,
`feedback-settings-modal-redesign-7e73.md`, `feedback-theme-persistence-bed6.md`,
`feedback-ui-polish-pass-e180.md` are all already `status: planned` from
earlier sessions).

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 8 implemented
(`test-coverage-backfill`, `playwright-client-coverage`,
`host-delegation`, `request-to-become-host`, `metronome-toggle`,
`count-in-toggle`, `consented-song-submission`) — see
`.project/artifacts/features.md`. New: `participant-selected-part`
(participant list shows each member's currently selected part) —
target it with `/ardd-plan participant-selected-part` when ready.

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

**4 new plans (2026-07-04), all `status: approved` with a `status: ready`
tasks file, none implemented yet:** `plan-session-lifecycle-2026-07-04.md`,
`plan-lobby-cursor-race-2026-07-04.md`, `plan-lyrics-pre-singing-2026-07-04.md`,
`plan-settings-modal-followup-2026-07-04.md`. Each was independently
reviewed by a background agent against the live codebase (not just its own
text) before approval — see each plan's tasks file for verification notes
(e.g. `tasks-session-lifecycle-836f.md` confirmed a genuine `WsClient.close()`
gap; `tasks-lyrics-pre-singing-e09e.md` caught a test assertion that breaks
under the new design; `tasks-settings-modal-followup-bbd2.md` reordered a
phase to satisfy constitution Principle VII test-first).

**1 new plan (2026-07-04), `status: approved` with a `status: completed`
tasks file (14/14):** `plan-config-env-convention-2026-07-04.md` →
`tasks-config-env-convention-9a7e.md`, on branch `config-env-convention` (a
separate worktree from the four plans above). Implements constitution
Principle VIII — done, see Constitution Compliance above.

## Implementation Status

**All backlogged features from this session are implemented and merged
to `main`**: `fix-lyric-css-colors-dead-code`,
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
across this entire session (all branches, all merges) was made with
`--no-gpg-sign` (1Password locked throughout). Re-sign the full range
once 1Password is available, before pushing anything.

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

1. Run `/ardd-implement` against any of the 4 new `status: ready` tasks
   files (`tasks-session-lifecycle-836f.md`,
   `tasks-lobby-cursor-race-c9f8.md`, `tasks-lyrics-pre-singing-e09e.md`,
   `tasks-settings-modal-followup-bbd2.md`) — all four are approved and
   waiting, none started.
2. Decide the metronome-per-participant question (low priority, no rush) —
   see `feedback-settings-modal-followup-d914.md`'s Reconsidered item.
3. Re-sign the full unsigned commit range before pushing anything to a
   remote — every commit this entire session was made with
   `--no-gpg-sign` (1Password locked throughout).
4. Principle VIII is implemented, verified, and merged to `main`
   (`config-env-convention`) — decide the CI-provider question (see
   `DEFECTS.md`) whenever a remote/CI system exists.
5. Run `/ardd-tasks` against `plan-server-failure-banner-2026-07-04.md`
   (branch `server-failure-banner`) to approve it and generate its tasks
   file, then `/ardd-implement`.
6. Separately, not blocking: attempt the remaining outstanding
   live-browser checks listed above.
