# sync-tab-scroll — Project Status

_Updated: 2026-07-19-real-audio (**`sync-tabs-to-real-audio` PLANNED +
TASKED — 23 tasks across 5 phases, `ready`.** Also: a mid-plan design
pivot and a research pass that reversed a stated concern.

**The pivot.** The feature was scoped from the vetting doc as a
session-level host toggle for audio source. Mid-plan the user re-scoped it
to **per-participant**: one participant hears the mp3 while another in the
same session hears the synth. The user gated approval on researching the
drift risk first — "if there are red flags, go back to the session
setting."

**The research** (`research-recording-mode-drift-2026-07-19-b7c2.md`)
found two distinct problems that land on opposite sides of that gate, and
corrected an earlier framing that had conflated them:
1. **The extrapolation-rate bug is design-independent.** `correctDrift`
   converts elapsed ms→ticks via `localTempoAtTick`, which walks
   `masterBar.tempoAutomations`. alphaTab keeps sync points in a
   *separate* `MasterBar.syncPoints` collection, and `syncBpm` is "the BPM
   the song will have virtually after this sync point" — so a
   tempo-automation walk can never observe a recording's effective rate.
   Error accrues at `elapsed_s × Δbpm × 16` ticks, crossing the 50-tick
   threshold within one ~1s report interval once **Δbpm > 3.125**. This
   occurs identically in a *uniform* recording session, so reverting to
   session-level buys nothing here. Primary-source evidence: the installed
   1.8.3 `.d.ts`.
2. **Mixed-mode musical divergence is per-participant-only and
   unfixable.** Sync points are a *map*, not a time-stretch — they locate
   a bar in the mp3 but cannot make it play at the notated tempo. Where
   the recording's real tempo diverges, synth and recording listeners
   genuinely separate (~26ms/sec at Δbpm=3.1 → ~1 beat after 30s). This
   *is* the red flag, and session-level would eliminate it by
   construction.

**Decision:** user chose **per-participant + a Δbpm guard**, knowingly
accepting the bounded risk. Divergence is computable at catalog load
(`CatalogSong.recordingTempoDivergence`), so a divergent song is flagged
rather than discovered mid-performance.

**Artifacts amended** (all four re-stamped `last_updated: 2026-07-19`,
diagrams → `stale`): `datamodel.md` (`CatalogSong` gains
`recordingPath`/`syncPoints`/`recordingTempoDivergence`; new
`FlatSyncPoint` entity — alphaTab's own type re-exported, not redefined,
per Principles V/VI; `PlaybackState` noted mode-agnostic), `ui.md` (the
mode-scoped, per-participant carve-out of the "full multi-track mix"
decision — mute/solo, metronome, count-in disabled in recording mode for
that participant only), `infrastructure.md` (Recording Playback Mode
subsection; host-source-keyed extrapolation; `audio/mpeg` + **HTTP Range
support** in `catalog-static.ts`, which currently pipes a plain 200 and
would break `<audio>` seeking), `pipeline.md` (optional `recording.mp3` +
`syncPoints`, authored externally via alphatab.net's Media Sync Editor).

**Bonus find:** `Score.applyFlatSyncPoints()`/`exportFlatSyncPoints()`
retires the vetting doc's open question 3 — store alphaTab's shape
verbatim, no adapter, no bespoke type.

**Plan/tasks:** `plan-sync-tabs-to-real-audio-2026-07-19-62cf.md`
(`approved`), `tasks-sync-tabs-to-real-audio-cb85.md` (`ready`, 23 tasks).
Phase 1 is deliberately diagnosis-first — a failing CT test against a
**deliberately skewed fixture** measures whether corrective seeks actually
stutter before any UI is built on the sync model. Three `[OPEN: ...]`
markers were introduced (infrastructure, ui, pipeline) and each is bound
to a specific task that retires it. Feature flipped
`backlogged → planned → tasked`. Not yet committed. Prior context below.)_

_Updated: 2026-07-18-night-8 (**Lyrics-dispatch fix SHIPPED — all 13 tasks
completed, merged to `main` (e37437d, fast-forward), worktree reaped.**
Delivered: shared GP-semantics dispatcher
`packages/shared/src/lyrics-dispatch.ts` (test-first; TIRO ground-truth
tests `describe.skipIf` when the gitignored catalog is absent), pipeline
`lyricsRawLine` publish + corrected `.lrc` (all four GP7/8 lyric songs
regenerated on disk), server loader passthrough, client
`walkLyricBeatsFromRawLine` wired into the overlay with `walkSyllables`
fallback, and the `correctDrift` pause fix reshaped (extrapolate only
while running, raw drift-correct otherwise — seek-while-paused
propagation preserved). **Live-verified in real Chrome**: bar 14 "be",
bar 69 "this?", bar 102 holds "ground", playback tracks verse 1. Suites:
shared 11, pipeline 25, client 108, server 230, playback-sync 23 — all
green. `tasks-99e6-e76f.md` flipped `abandoned` with a resolution note.
Two follow-ups: (1) upstream alphaTab issue DRAFTED, not filed — awaits
user OK (draft in the session scratchpad, `alphatab-issue-draft.md`);
(2) minor deviation: regenerated metas dropped a legacy `bpm` field the
pipeline never wrote — verified unread by any consumer._

_Updated: 2026-07-18-night-7 (**Lyrics-dispatch plan approved + tasked.**
`plan-lyrics-dispatch-2026-07-18-8090.md` (`approved`) consumes
`feedback-lyrics-dispatch-root-cause-f0f6.md` (now `planned`, F001+F002
both incorporated) and **supersedes `plan-99e6-2026-07-18-6d2b.md`** (the
tie-boundary plan blocked at T003 — its mystery is resolved upstream).
Tasks file `tasks-lyrics-dispatch-0f0e.md` is `ready`: 13 tasks across 5
phases — shared GP-semantics dispatcher (test-first from the 3 TIRO ground
truths), pipeline `lyricsRawLine` publish + corrected `.lrc` + catalog
regen, client overlay switch-over with legacy fallback, `correctDrift`
pause-fix reshape (F002), and close-out (abandon tasks-99e6, optional
upstream alphaTab issue). Next: `/ardd-implement`._

_Updated: 2026-07-18-night-6 (**Lyrics ticker desync ROOT-CAUSED — new open
feedback `feedback-lyrics-dispatch-root-cause-f0f6.md` awaiting
`/ardd-plan`.** Live static repro (no playback, host, local: clicking a
note highlights the wrong lyric — 3 user ground truths on "TIRO" at bars
14/69/102) traced to alphaTab's `Track.applyLyrics` dispatch diverging
from Guitar Pro semantics for track-level lyric lines: it doesn't skip
tie-destination beats for real syllables, and it burns empty chunks
(multi-space beat-skips) only on playable beats instead of any beat. A
prototype chunk-driven dispatcher reproduces all three ground truths
exactly (probe scripts `packages/pipeline/src/tiro-probe*.ts`, to be
removed on implementation). Affects **all** lyric-bearing catalog songs
(4 GP7/8 + the GP5 Supermassive; Lazy Eye lyric-less). This resolves the
`tasks-99e6-e76f.md` T003 blocker's mystery — the bug is upstream of both
of that plan's candidate sites, at score-load time. F002 in the same
feedback file records a separate latent `correctDrift` paused-extrapolation
bug with an uncommitted working-tree fix (tests pass, but the guard shape
needs a seek-while-paused decision before commit)._

_Updated: 2026-07-18-night-5 (**`tasks-99e6-e76f.md` (lyrics-ticker
tie-boundary fix) run and merged, 2/5 — blocked on T003.** T001/T002
ruled out both of the plan's declared candidate root causes (the shared
walk's tie/dedup logic, and the client's tick-compare loop) against
current code and the real "TIRO" catalog data; the reported early-highlight
did not reproduce. See Plans & Tasks and Recommended next step below for
the two follow-up leads. No other artifact/backlog/feedback state changed
this pass — see Plans & Tasks for details._

_Updated: 2026-07-18-night-4 (**Deploy crash fully resolved (2nd root cause
found), Node 20→22 LTS shipped, and the two open feedback items planned +
tasked.**

1. **Deploy crash — real fix.** The `b02a136` pipeline `main`-field fix
   (previous entry) turned out to be necessary but not sufficient: a fresh
   Railway deploy from that commit still crash-looped with the identical
   `ERR_UNKNOWN_FILE_EXTENSION`. Root cause #2: `packages/shared/package.json`
   had the same `"main": "./src/index.ts"` bug, and shared is **not**
   type-only as the Dockerfile's stale comment claimed —
   `packages/pipeline/dist/gp-parser.js` has a real runtime import
   (`walkSyllables` from `@sync-tab-scroll/shared`). Fixed by pointing
   shared's `main`/`types` at `./dist/index.js`/`./dist/index.d.ts` and
   correcting the Dockerfile comment (`a9e7e73`). Verified via a real
   prod-style `pnpm --filter server deploy --legacy --prod` build run under
   `node dist/index.js` (Node 20) with no crash, and confirmed on Railway:
   deployment `a8135fb6…` **Online**, `https://sts.ty-pe.com/` → HTTP 200.
2. **Node.js 20 → 22 LTS.** `Dockerfile` (both stages), root
   `engines.node`, `.github/workflows/ci.yml`, `@types/node` (server +
   pipeline), README, and `pnpm-lock.yaml` all bumped (`4d4a6bf`). Verified
   locally under Node 22.22.3: build, typecheck, and all tests (228 server +
   104 client + 18 pipeline) green. No native-addon/alphaTab compatibility
   issues found. Also added `.nvmrc` pinned to `22` (`2b4c6e5`). Railway
   redeployed on the Node 22 image and is confirmed Online, logs clean.
3. **`/ardd-plan` run on the 2 open feedback items** — `plan-99e6-
   2026-07-18-6d2b.md` (**approved**), `tasks-99e6-e76f.md` (**ready**,
   5 tasks / 3 phases). Diagnose-then-fix the lyrics-ticker early-highlight
   at the "TIRO" measure 8→9 tie boundary (`feedback-lyrics-ticker-
   tiro-measure8-9310.md` F001), with the still-open audio-output-latency
   research thread (`feedback-audio-output-latency-t014-dfa8.md` F001)
   folded in and closed out as superseded by this sharper, non-latency
   repro rather than pursued further this pass. Both feedback files flipped
   `open` → `planned`, bound to this plan. **0 open feedback files remain.**

Prior context below.)_

_Updated: 2026-07-18-night-3 (**Prod crash fixed: `packages/pipeline`'s
`main` pointed at raw `.ts` source, not the built `dist`.** User reported a
Railway crash alert; `railway logs` showed every boot failing with
`ERR_UNKNOWN_FILE_EXTENSION` for `.../@sync-tab-scroll/pipeline/src/index.ts`
— plain `node dist/index.js` in the production container has no TS loader.
Root cause: `f83d939` (phase-2-in-app-authoring, T008–T010) added
`"main": "./src/index.ts"` / `"types": "./src/index.ts"` to
`packages/pipeline/package.json` when the server's upload route started
importing the package at runtime — fine under `tsx`/`vite` in dev, fatal in
prod where only `dist/*.js` exists (no `dist/index.js` had ever been
generated either, since nothing referenced the package root before). Fixed
by pointing `main`/`types` at `./dist/index.js` / `./dist/index.d.ts`.
Verified: `pnpm --filter @sync-tab-scroll/pipeline build` produces
`dist/index.js`, full `pnpm build` and `pnpm check` (typecheck) pass, all
228 server tests pass, and a simulated `pnpm deploy --prod` layout resolves
the package to the compiled JS (not `.ts`). Committed and pushed (signed)
`b02a136`; Railway redeploy triggered, in progress as of this entry. This
was a **pure infra/tooling fix** — no artifact, feature-register, or
feedback-file changes, so most of this run was fact-gathering (see below)
rather than a design/product update. Prior context below.)_

_Updated: 2026-07-18-night-2 (**Full test suite green — all 6 failures from
the prior entry root-caused and fixed (`e67d54e`).**

1. **The real regression** (`SettingsModal.ct.spec.ts` phone-width test):
   `.tab-strip > :global(.btn) { flex: 1; ... }` silently stopped matching
   once `Button.svelte` started wrapping every `.btn` in a `.btn-wrap` span
   (`tasks-hover-long-press-tooltip-for-i-9124`) — `.btn` became a
   grandchild, not a direct child. The 4 tab buttons lost their compact
   sizing and overflowed the strip by ~145px at phone widths. Fixed by
   retargeting the selector at `.btn-wrap` (plus `min-width: 0`, needed
   for `flex: 1` to actually shrink below the longest single-word label's
   min-content width — without it, "Preferences" alone still overflowed
   by ~30px at 360px) and sizing the nested `.btn` to `width: 100%`.
2. **Two stale e2e assumptions**, invalidated by earlier bottom-bar-icons
   work this session, not by the fan-out: `expect(page.locator('svg')).
   toHaveCount(0)` used to mean "no tab canvas rendered," but icon-only
   bar controls (Cog, Play/Pause/Square, LogOut, MicVocal) render inline
   `<svg>` too, so a page-wide count is never 0 anymore — rescoped both
   assertions to `.tab-container svg`.
3. **One pre-existing test/behavior mismatch**: `host-controls.spec.ts`
   asserted `.playback-controls` visible for a member who deliberately
   selected the Lyrics part — but `App.svelte`'s `.app-content.collapsed
   { display: none }` intentionally hides `.playback-controls` for the
   lyrics part (that participant's view is the separate `.full-lyrics-
   view` element instead). Fixed the assertion to check the right element
   per participant.

All three diagnosed with targeted CT-harness diagnostics (not guessed) —
see the fix commit's message for the reasoning trail. **Final verified
state**: `tsc --noEmit` clean, 104/104 vitest unit tests, 173/173
Playwright tests (CT + e2e), all green together. Prior context below.)_

_Updated: 2026-07-18-night (**All 3 fanned-out worktrees merged; new feature
backlogged; one test regression found, not yet fixed.**

**Merges**: `settings-personal-prefs-bundle` (`91f7199`, 3 features →
implemented), `hover-long-press-tooltip-for-i` (`2e6729e`, → implemented),
`latency-compensated-position-extrapolation` (`760b60b`, → implemented,
auto-merged a shared edit to `lyrics-gap-timing.ts` cleanly). All three
worktrees reaped. Post-merge: `tsc --noEmit` clean, all 104 vitest unit
tests pass. Feature backlog now 3 backlogged / 21 implemented (was
2 backlogged / 5 tasked / 16 implemented).

**Known regression, NOT yet fixed**: the full Playwright suite (167
passed / 6 failed) surfaced `SettingsModal.ct.spec.ts`'s phone-width test
("no tab of the modal needs horizontal scrolling at 390px") failing on
the **Participants** tab specifically — `div.modal-body` overflows
horizontally by ~129px, violating `ui.md`'s Small Screens invariant ("no
horizontal scrolling, anywhere"). Root cause not yet found: tabs render
via `{#if}/{:else if}` (properly unmounted, not `display:none`-hidden),
so it isn't an inactive-tab-still-in-flow leak; the overflow appears
already on the *first* (default) tab, before any Preferences/Tracks-only
new markup is even shown, which rules out the obvious suspects (Solo
button, font-size/measure-markers controls). Needs a real debugging
session (Playwright trace/live browser), not a guess-and-patch. The other
5 e2e failures (`host-controls.spec.ts`, `single-participant.spec.ts`,
`small-screen.spec.ts` ×3) were not investigated this session — unclear
whether they're related, pre-existing/flaky, or need the e2e webServer
running independently; check those alongside the CT regression.

**New feature backlogged**: `count-in-metronome-beat-widget` — a single
shared visual widget in the persistent Bar for count-in (counts down 4→1,
every participant, gated on `Session.countInEnabled`) and metronome
(counts up 1→4 + measure number, personal, gated on each participant's
own Metronome preference). Fill color alternates primary→secondary /
secondary→primary each beat. Timing driven by real beat boundaries via
`api.tickPosition` + `tempo-lookup.ts`'s `localTempoAtTick` (this
session's newly-extracted module) — not a naive timer. Colors/exact
shape left to implementation judgment. Designed via conversation before
backlogging, not backlogged from a one-line ask.

Prior context below.)_

_Updated: 2026-07-18-later-5 (**Fanned out the slate's Parallel-set bucket —
2 of 3 planned+tasked, 1 skipped by user choice.**
`latency-compensated-position-extrapolation`: plan-latency-compensated-
position-extrapolation-2026-07-18-81b7.md, 3 tasks (extract a shared
`localTempoAtTick()` from `lyrics-gap-timing.ts` into new
`tempo-lookup.ts`, then wire it into `playback-sync.ts`'s `correctDrift()`
to project `PlaybackState.tickPosition` forward by elapsed time since
`serverTimestamp` before the drift comparison — confirmed distinct from
this session's separately-filed TIRO lyrics-ticker-desync feedback, a
different mechanism entirely). `hover-long-press-tooltip-for-i`:
plan-hover-long-press-tooltip-for-i-2026-07-18-c2e5.md, 2 tasks (new
`Tooltip.svelte` + pointer-event wiring in `Button.svelte`'s `iconOnly`
mode — hover via `pointerenter`/`pointerleave`, long-press via a
~500ms `pointerdown` timer). `host-mandated-bars-per-row-layout` was
**skipped** at the user's choice — its register entry poses a real
unresolved host-vs-participant-vs-both design fork; still `backlogged`,
untouched. Also caught and fixed **two stale `ui.md` claims** encountered
while updating it for the tooltip feature: "Song & part stays a text
control" (it became an icon-only `ListMusic` button earlier this session
but that code fix was never synced to `ui.md`) and the missing mention of
the lyrics-toggle's Lobby-reachable `MicVocal` icon. Both `infrastructure.md`
and `ui.md` re-stamped `last_updated: 2026-07-18`, `diagram_status: stale`.
Feature backlog is now 2 backlogged / 5 tasked / 16 implemented (was 4/3/16
before this run's host-mandated skip and two new tasked features — net:
+1 tasked, -2 backlogged from the skip decision leaving that one alone).
Plan/tasks/artifact changes from this run not yet committed. **In flight:**
the earlier-delegated `tasks-settings-personal-prefs-bundle-ed57.md`
worktree now reports 5/5 checkboxes done, still `in-progress` — likely
finishing its completion/test-suite verification steps; not yet reported
back to this coordinator. Prior context below.)_

_Updated: 2026-07-18-later-4 (**plan-settings-personal-prefs-bundle approved
and TASKED — 5 tasks across 3 phases, `ready`.** Bundles the three features
`/ardd-plan --slate` grouped together (all edit `SettingsModal.svelte`):
`lyrics-overlay-measure-lines-a` (in-tab ticker measure-boundary lines +
numbers, gated behind a new "Measure markers" Preferences toggle, default
off — reuses `lyrics-gap-timing.ts`'s measure-duration math and the
existing `gap-dot`/`gap-drain` marker-insertion pattern),
`lyrics-ticker-font-size-prefer` (4-step small/medium/large/huge Preferences
control, medium = today's fixed `1.125rem`), and `solo-mute-button-per-part`
(a "Solo" button per Tracks-tab row, reusing the existing
`api.changeTrackMute()`/`track-mute-preference.ts` mute mechanism — not a
new persisted "solo mode"). `ui.md` updated (Preferences/Playback
View/Tracks sections), `last_updated: 2026-07-18`, `diagram_status: stale`.
All 3 features flipped `backlogged → planned → tasked`. Feature backlog is
now 4 backlogged / 3 tasked / 16 implemented (was 7/0/16). All 5 tasks carry
test-first requirements (Playwright CT + unit tests for the new preference
modules). Plan/tasks/artifact changes not yet committed. **User feedback on
the `/ardd-plan --slate` report format itself** (not app feedback — feedback
on this skill's output): the prior slate run's Bundle/Parallel-set/
Solo-deferred prose was confusing about what was safe to plan together;
should be laid out as clearer distinct phases/sections rather than dense
prose. Noted for future `/ardd-status`/`/ardd-plan` slate-report formatting;
not an app-code change. 2 open feedback files unchanged
(`feedback-audio-output-latency-t014-dfa8.md`,
`feedback-lyrics-ticker-tiro-measure8-9310.md`). Prior context below.)_

_Updated: 2026-07-18-later-3 (**New feature backlogged:
`lyrics-ticker-font-size-prefer`.** A personal Preferences-tab toggle
(same pattern as Metronome/Mute-parts) for the in-tab lyrics ticker's
font size: small/medium/large/huge, with the current fixed
`1.125rem` (`client/src/styles/motifs.css` `.lyrics-overlay`) becoming
the medium default, and each step requested to be a large, clearly
noticeable jump rather than a subtle scale. Feature backlog is now 7
backlogged / 16 implemented (was 6/16). Prior context below.)_

_Updated: 2026-07-18-later-2 (**Direct icon/a11y fixes applied to
`App.svelte` (uncommitted), plus a new feature backlogged.** From live
icon-pick feedback: swapped "Song & part" from a text button to an
icon-only `ListMusic` button, and (earlier this session) the lyrics
toggle from `AudioLines` to `MicVocal` and widened its visibility from
Playback-only to `hasPart` (reachable in the Lobby too). Audited every
other `<button>` in the client for missing accessible names — `Modal.svelte`'s
close × already has `aria-label="Close"`, `AccountMenu.svelte`/
`Landing.svelte` buttons all render visible text (self-describing); icons
appear only via `Button.svelte`'s `iconOnly` prop, which already sets
`aria-label`/`title` from the button's `label` — no gaps found. Extended
`app-bar-controls.ct.spec.ts` to cover the new Song & part assertion and
the Lobby-visible lyrics toggle; all 5 tests pass, typecheck clean. New
feature backlogged: `hover-long-press-tooltip-for-i` — a styled,
touch-aware tooltip (hover + long-press) for the bar's icon-only buttons,
beyond the native `title` attribute already in place. Feature backlog is
now 6 backlogged / 16 implemented (was 5/16). `client/src/App.svelte` and
`client/src/app-bar-controls.ct.spec.ts` are modified, uncommitted. Prior
context below.)_

_Updated: 2026-07-18-later (**New bug filed:
`feedback-lyrics-ticker-tiro-measure8-9310.md`.** Sharper repro of the
in-tab lyrics ticker desync than the earlier `feedback-lyrics-timing-
tiro-c741.md` F001 (accepted research-only, unresolved): on "TIRO" bass
part, measure 8's last note (fret 3, lowest string) is a breath with no
syllable, but the ticker jumps early and highlights "You're" — which
should instead tie to measure 9's first note. Tagged `[artifacts: ui]`.
Suggests the root cause may be a note/tie-boundary bug in the
syllable-tick walk itself, not output latency (the `feedback-audio-
output-latency-t014-dfa8.md` open item's working hypothesis) — worth
investigating both together when this is next planned. Open feedback
count is now 2. Everything else unchanged from the prior entry. Prior
context below.)_

_Updated: 2026-07-18 (**New feature backlogged: `lyrics-overlay-measure-
lines-a`.** From a live-inspection conversation about whether Bluetooth
output latency explains a perceived ticker offset — the user asked how
hard it'd be to add measure lines/numbers to the in-tab lyrics ticker for
easier orientation; classified as a new capability (not a fix to existing
behavior) and re-filed straight to the feature register rather than a
feedback file, per `/ardd-feedback`'s new-capability re-file step. Scope
confirmed with the user: gated behind a personal Preferences toggle
(default off), same pattern as the existing Metronome/Mute-parts personal
toggles. `status: backlogged` — not yet targeted by any plan. Feature
backlog is now 5 backlogged / 16 implemented (was 4/16). Everything else
unchanged from the prior entry: ArDD `up-to-date` at v0.10.1 (beta
channel), 1 open feedback file (`feedback-audio-output-latency-t014-
dfa8.md`), no in-flight worktrees, `infrastructure.md`/`ui.md` diagrams
still stale. Prior context below.)_

_Updated: 2026-07-17-night-5 (**ArDD updated to v0.10.1 (beta channel),
commit `a802dbc`.** `/ardd-update --beta` switched the tracked source
from the recorded dev-mode checkout to the tooling-owned checkout
(`~/.ardd/source`), resolved to tagged release `v0.10.1` (a stable
release that supersedes the earlier `v0.10.1-beta.11` prerelease this
project had been behind). Reinstalled cleanly — all 8 migrations already
applied, no pending ones. Workflow fields (`next_step_prompt: true`,
`delegation: eager`, `merge_policy: auto`) were already set, nothing to
backfill. Suggestion surfaced (not yet applied): `git config
merge.ours.driver true` in this clone for automatic report-file conflict
resolution on future merges. `/ardd-status`'s update-availability check
now reports `up-to-date`. `.project/ardd-version.md` modified,
uncommitted. Everything else unchanged from the prior entry: 1 open
feedback file (`feedback-audio-output-latency-t014-dfa8.md`, filed by the
concurrent tasks-1619 run — needs live device access to pursue), no
in-flight worktrees, `infrastructure.md`/`ui.md` diagrams still stale
(datamodel.md current), no defects since 2026-07-12. Prior context
below.)_

_Updated: 2026-07-17-night-4 (**tasks-1619-1185 COMPLETED, merged.** All 20
tasks across `plan-1619-2026-07-17-39c6.md`'s 5 phases. Delegation needed
two attempts — the first worktree came up branched from a stale base with
`.claude/skills/ardd-scripts/` entirely missing despite `.worktreeinclude`
being correctly configured; it stopped cleanly per its own instructions
(no work attempted) and was auto-reaped since it made no changes. The
retry succeeded. **Delivered:**
- **Phase 1** — unified the pipeline's and client's independently-drifted
  GP-lyric-syllable walks into `packages/shared/src/lyrics-walk.ts`
  (new workspace package dependency on `@coderline/alphatab`). Fixed a
  real bug: dedup is now tie-aware
  (`beat.notes.some(n => n.isTieDestination)`) instead of same-text-only,
  so genuinely-repeated syllables ("yeah, yeah, yeah") no longer wrongly
  collapse; pipeline also picked up the client's correct
  `absolutePlaybackStart` tick source it never had.
- **Phase 2** — replaced word-count-proportional `.lrc` line-boundary
  guessing (`distributeByWordCount`) with real timestamp-based alignment
  (`parseLrclibLinesWithTimestamps`, `buildMsToTick`,
  `alignLinesByTimestamp`) — fixes the confirmed drift bug from
  `feedback-lyrics-timing-tiro-c741.md` F002. T013 manual verification
  done at the code level (no network/browser access in the worktree):
  confirmed the "You will be the death of me" syllable's true GP tick
  converts to 23.898s, matching the feedback's independently-derived
  ~23.9s finding.
- **Phase 3 (F001 ticker-offset research)** — alphaTab's public API
  doesn't expose `AudioContext`/`outputLatency`; only reachable via an
  unsupported internal cast. Empirical device comparison (Bluetooth vs.
  wired) wasn't possible in the worktree. **No fix implemented** — T015
  correctly stayed gated-off per the plan; findings filed as follow-up
  feedback `feedback-audio-output-latency-t014-dfa8.md` (now the sole
  open feedback file) for a future pass with real device access.
- **Phase 4** — "Mute parts" moved out of Preferences into its own 4th
  "Tracks" tab, one row per part (`SettingsModal.svelte`).
- **Phase 5 (playback-start stutter)** — found a clean *public* mechanism
  this time (`api.player.output.activate()`, unlike Phase 3's dead end):
  implemented `warmUpAudioOutput()` in `client/src/readiness.ts`, wired
  into `playback-engine.ts` at part-load time. Could not empirically
  confirm it eliminates the reported stutter (no live audio testing in
  the worktree) — documented as an open caveat in `infrastructure.md`.

Merged clean (`8603fa9`) after two hiccups on the coordinator side: the
default git signing key failed mid-merge-commit (1Password locked —
retried with the project's dedicated Claude signing key) and the merged
`pnpm-lock.yaml`/`packages/shared/package.json` changes needed a fresh
`pnpm install` before the pre-commit typecheck hook would pass (new
`@coderline/alphatab`/`vitest` deps in `packages/shared` weren't yet in
`node_modules`). Post-merge, re-verified in the primary checkout (not
just trusting the subagent's own worktree report): `pnpm -r test` — 228
server + 91 client + 18 pipeline unit tests, all green; 53 client CT
tests (SettingsModal, lyrics-overlay, playback-engine) all green.
Worktree reaped. **`infrastructure.md` and `ui.md` diagrams are stale
again** (Phase 1/5 and Phase 4 artifact edits) — `datamodel.md` still
current. Prior context below.)_

_Updated: 2026-07-17-night-3 (**tasks-bottom-bar-icons-47a6 COMPLETED and
merged.** Delegated worktree run executed all 5 tasks test-first: T001
added `lucide-svelte` + `Button.svelte`'s `icon`/`iconOnly` props; T002/T003
(combined, same file) swapped Settings/Start/Pause-Resume/Stop/Leave-session
to icon-only buttons (`Cog`, `Play`/`Pause`/`Square`, `LogOut`) and moved
"Toggle lyrics" from `Playback.svelte` into the bar as an `AudioLines`
icon button; T004 fixed the lyrics-off bug — root cause was **not** the
overlay's own `display:none` (already worked) but `App.svelte`'s
`.engine-containers.visible` reserved `padding-bottom` staying applied
regardless of toggle state (`showOverlay` lived only in
`playback-engine.ts`'s module closure) — fixed via a new
`clientStore.lyricsOverlayVisible` mirror and a `.lyrics-overlay-hidden`
class; T005 updated `ui.md` (now `diagram_status: stale` — a later
`/ardd-diagram ui` run should refresh it). All 134 Playwright CT tests +
88 vitest unit tests + `pnpm check` passed. Worktree commits were
unsigned (no 1Password in that session) — re-signed via
`git rebase -x` with the on-disk Claude signing key before merging
(hit and worked around a `commit.gpgsign` default forcing 1Password
signing during rebase `pick` steps — fixed by passing
`-c commit.gpgsign=false` on the outer `git rebase` invocation). Merged
clean (fast-forward, `4a4774a`) per `merge_policy: auto`, worktree reaped.
Feedback file's item count is unchanged at 0 open. **A second, unrelated
worktree remains in flight**: `tasks-1619-1185.md` (lyrics-timing/
mute-parts/playback-stutter), 18/20, not part of this run — see In Flight
below. Prior context below.)_

_Updated: 2026-07-17-night-2 (**plan-bottom-bar-icons approved and TASKED —
5 tasks across 4 phases, `ready`.** Consumes `feedback-bottom-bar-icons-3a15.md`
(the file left `open` by the concurrent plan-1619 run noted below) in full:
F001 (lyrics-off bug — background strip stays visible; likely cascade
conflict between the duplicate unscoped `.lyrics-overlay` rule in
`lyrics.css` and the real strip styling in `styles/motifs.css`, to be
root-caused live per this project's established CSS-bug pattern), F002
(move "Toggle lyrics" from `Playback.svelte` into the persistent bar),
F003–F005 (bar's Settings/play-pause-stop/leave-session controls become
icon-only, tape-recorder-styled for transport), F006 (adopt `lucide-svelte`
as the icon library, extending `Button.svelte` with an `iconOnly` prop +
`aria-label` for accessibility). All 5 tasks carry Playwright CT test
requirements except T005 (docs-only `ui.md` sync, exempted per constitution
Principle VII). Feedback file now `status: planned`, `plan:
plan-bottom-bar-icons-2026-07-17-fdd5.md`. No feature-register slugs bound
(feedback-only plan). Open feedback count is now 0 — every feedback file
in `.project/feedback/` is `planned`. Not yet committed to git. Prior
context below.)_

_Updated: 2026-07-17-later-night (**plan-1619 approved and TASKED — 20
tasks across 5 phases, `ready`.** Covers 3 of the (then-)4 open feedback
files: `feedback-lyrics-timing-tiro-c741.md` (F002+F003 accepted with
concrete fixes; F001 accepted as **research-only** per explicit user
choice — user confirmed Bluetooth output when they noticed the ticker
offset, untested against speakers), `feedback-mute-parts-own-tab-cf6d.md`
(accepted), and `feedback-playback-start-stutter-2052.md` (accepted,
research-then-fix-if-feasible). All three now `status: planned`,
`plan: plan-1619-2026-07-17-39c6.md`. Key design decision: **unify the
pipeline's and client's independently-drifted GP-lyric-syllable walks**
into one shared `packages/shared/src/lyrics-walk.ts` (Phase 1) — pipeline
still used the pre-T004 tick formula and had no dedup at all, while the
client's same-text-only dedup turned out to be unsound (wrongly collapses
genuinely-repeated distinct syllables like "yeah, yeah, yeah"; the correct
discriminator is note-tie continuation, `beat.notes.some(n =>
n.isTieDestination)`). F002's actual fix (Phase 2): lrclib's per-line
timestamps are currently parsed then **discarded**
(`lrclib.ts#parseLrclibLines`) in favor of word-count-proportional line-
break guessing (`distributeByWordCount`, confirmed wrong: 41/44 lines
mis-assigned on the reported song) — replacing it with actual
timestamp-to-tick boundary placement, immune to the GP/lrclib textual
mismatches that broke word-count matching. F001 (Phase 3) and the
playback-stutter item (Phase 5) are explicitly scoped as
research-task-first, implementation-gated-on-outcome — neither commits to
a fix without confirmed root cause. `feedback-bottom-bar-icons-3a15.md`
(filed in a concurrent session, see the dated note below) was **not**
in scope for this plan — it stays `open` for a later `/ardd-plan` run.
Committed `4ec0d3c` (plan+tasks+feedback) and `cecab99` (the concurrent
session's STATUS.md entry, committed alongside). Prior context below.)_

_Updated: 2026-07-17-night (**New feedback filed:
`feedback-bottom-bar-icons-3a15.md` (6 items, all `[artifacts: ui]`,
1 bug + 5 UX) from live inspection of the bottom bar.** Bug: toggling
lyrics off currently hides only the lyric words, not the background
strip behind them. UX: move 'toggle lyrics' into the bottom bar; swap
play/pause and stop text labels for tape-recorder-style icons; swap
settings' text for a cog icon; swap leave-session's text for an
exit-door icon; adopt an icon library (e.g. lucide) to support all of
the above. Open feedback count is now 1 (all 32 other feedback files
are `planned`). Everything else below is prior context — unchanged
this run: diagrams all `diagram_status: current`, no defects since
2026-07-12, feature register 4 backlogged / 16 implemented, no
in-flight worktrees, ArDD update available (installed
`bdd553e`, latest release `v0.10.1-beta.11`, beta channel) — run
`/ardd-update` if desired. Recommended next step: `/ardd-plan` to pick
up the new feedback file. Prior context below.)_

_Updated: 2026-07-17-evening (**Two new open bugs filed
(`feedback-lyrics-timing-tiro-c741.md`); diagram regen + local-dev-port
fix done but UNCOMMITTED.** From live local-instance testing (user session,
not an `/ardd-implement` run):
- **F001** — the in-tab lyrics ticker on "Time Is Running Out" highlights a
  syllable ~2 syllables (960 ticks) ahead of actual playback ("be"
  highlighted when "You" should be, first "You will be the death of me").
  Same symptom class the `lyrics-ticker` plan's T004 already fixed once
  (switching to `beat.absolutePlaybackStart`) — either a residual case or a
  file-specific quirk (an unlabeled, un-lyriced beat sits immediately
  before the "You" beat). Static `.gp` parse ruled out repeats, ties,
  grace notes, and mid-song tempo automation as causes; needs live-audio
  comparison to actually pin the fix.
- **F002** — the full lyric sheet (Lyrics-part view, `.lrc`-driven)
  progressively drifts further ahead of audio as the song plays
  ("about a line ahead" later on) — a *growing* drift, mechanically
  distinct from F001. Root-cause hypothesis with code evidence:
  `lrc-writer.ts`'s `buildLrc()` slices the GP-derived syllable stream into
  per-line windows purely by `lyricLineBreaks[i]` counts, while a line's
  *displayed text* can come from lrclib.net instead (confirmed for this
  song: GP lyrics read "You will be the death of me", `.lrc` shows "And
  you will be..."). If an early line's assigned count doesn't match the
  true GP count, the slice desyncs and the error compounds each
  subsequent line. Total counts balance overall (333=333), so it isn't a
  gross miscount if real — a subtler `line-breaks.ts` boundary-placement
  bug. Needs live-audio verification before `/ardd-plan` picks it up.

**Separately, uncommitted in the working tree** (from the same local-testing
session, not yet committed pending the user's active use of the instance):
diagram regeneration for all three stale artifacts (`datamodel.md`,
`infrastructure.md`, `ui.md` → `diagram_status: current`, `README.md`'s
Datamodel/Infrastructure/UI sections rewritten) and a local-dev port fix
(client Vite dev port `6000` → `6100` — Chrome refuses to navigate to 6000
at all, it's on Chromium's hardcoded unsafe-ports list — touching
`client/vite.config.ts`, `server/src/config.ts`'s `publicBaseUrl` default,
`server/.env.example`, and the three tests that pinned the old port
literal). Both changes are verified working (tests pass, local instance
confirmed reachable at `:6100`) but not yet committed — commit once the
user is done testing. Prior context below.)_

_Updated: 2026-07-17-later (**tasks-lyrics-pre-singing-e09e T008 verified
live, file COMPLETED.** The one remaining open task across both lyrics-
ticker tasks files. Same live-browser methodology as the note below:
second Vite instance on port 6002 (Chrome refuses port 6000), real
session, `Kinda Bad` catalogue unlocked, Radiohead "Creep", "Lead Guitar"
instrument part. Confirmed pre-play: the "…" placeholder carries
`at-highlight` and is centered (~7.5px diff, not left-aligned, no snap
since playback hadn't started). After clicking Start: the transform read
via `getComputedStyle` showed no discontinuous jump — the placeholder's
centered transform carried straight through to the first real syllable
("an-") activating already centered (~1.8px diff), with the placeholder
then `display: none` (one-way, matching T006's guard). Committed
`33bf4a3`, signed. **Both `tasks-lyrics-ticker-75dd.md` and
`tasks-lyrics-pre-singing-e09e.md` are now `completed`** — the
2026-07-04 live-verification failure chain (original ticker → pre-singing
placeholder fix) is fully closed out. Prior context below.)_

_Updated: 2026-07-17 (**tasks-lyrics-ticker-75dd T004 re-verified live, file
COMPLETED.** This tasks file had sat at a non-standard `reopened` status
since 2026-07-04, when the user's live-browser check failed T004 (ticker
left-aligned, snapped to center on first syllable). That failure was
diagnosed and actually fixed later, in a separate plan/tasks file
(`tasks-lyrics-pre-singing-e09e.md`, `in-progress` 8/9 — its T004 rewrote
`centerActiveSyllable()` to use `getBoundingClientRect()` + a live
`getComputedStyle(track).transform` readback instead of the original
`offsetLeft`/`clientWidth` formula). This run re-drove T004 live: started
both dev servers (a second Vite instance on port 6002 was needed — Chrome
refuses port 6000 as an unsafe port), created a real session via
`claude-in-chrome`, unlocked the `Kinda Bad` catalogue (activation key
pulled from 1Password on request), loaded Radiohead "Creep"
(`lyricsTrackIndex: 0`), and viewed the "Lead Guitar" instrument part (a
different track than the lyrics track, per the task's own wording).
Instrumented `getBoundingClientRect`/`getComputedStyle` directly during
live playback: no line wrapping (`white-space: nowrap` + `overflow:
hidden` confirmed), the active syllable's bounding-box center tracked the
overlay's center to sub-pixel precision across 8 consecutive syllables,
and a `resize` dispatched mid-playback (1200px → 700px) re-centered
correctly. T004 marked `[x]`, file frontmatter flipped `reopened →
completed` by hand (the state-machine script doesn't recognize the
free-text `reopened` status as a valid `from` state). Committed `006c5c5`,
signed. **tasks-lyrics-pre-singing-e09e.md's own T008 (the equivalent
live check for its pre-singing-placeholder behavior) remains open** — this
run only re-verified the ticker-centering fix's *carry-over* correctness
via the same code path, not lyrics-pre-singing's placeholder/UX additions
specifically; a human (or a future pass with the Chrome tools) should
still drive that file's T008 separately. Prior context below.)_

_Updated: 2026-07-16 (**phase-2-in-app-authoring IMPLEMENTED — merged, pushed.**
All 18 tasks in `tasks-phase-2-in-app-authoring-48d5.md` complete (`completed`),
implemented in a delegated worktree (`phase-2-in-app-authoring-impl`,
test-first throughout — 13 new/changed server tests + 6 new CT tests, 225
server + 88 client + 10 CT tests green, typecheck clean across all 4
workspace packages), fast-forward-merged into `main` at `fd26a4d`, worktree
reaped, and pushed. Delivered: `CatalogueOwnership` Postgres table +
`set-catalogue-owner` CLI; mutable/dynamic in-memory catalog with
per-user visibility (an owner sees their own unpublished catalogue);
`Participant.userId` on the wire; an authenticated upload trust surface
(`POST /catalogues/:id/songs` — 401/403 auth gate, size-limited staged
upload, parse-timeout-bounded pipeline execution, nothing reaches the
live catalog until validated); a runtime `SONG_UPLOAD_ENABLED` flag
(default on) gating the route and surfaced on `/me` so the client renders
"Add song" absent, not disabled, when off; upload now writes a Consent
Record via the same `recordConsent()` the CLI's `record-consent` uses;
a new `AuthoringModal.svelte` (My catalogues, Create catalogue,
XHR-driven Add-song form distinguishing uploading/processing via the
upload's own progress/load events, Co-owners roster + Generate-invite-link);
`POST /catalogues` (create), `POST /catalogues/:id/invite` (generate),
`POST /invites/redeem` (redeem — grants ownership + membership in one
action), `GET /catalogues/:id/owners` (roster). Feature register:
`phase-2-in-app-authoring` → `implemented` (16 implemented total).
**Note (unresolved):** the standalone backlog entry
`catalogue-co-owner-invite-flow` (filed 2026-07-15) is now redundant —
its scope shipped as this plan's Phase 6 (T016–T018) — but `/ardd-status`
can't retire it itself (register writes aren't its job, and
`feature-flip` refuses a non-adjacent `backlogged→retired` jump). Retire
it by hand (or via `/ardd-refine`) when convenient. **Not yet done:**
the three stale diagrams (datamodel/infrastructure/ui — Phase 2 touched
all three) still need `/ardd-diagram`; `DEFECTS.md` (last checked
2026-07-12) predates this whole feature. Prior context below.)_

_Updated: 2026-07-16-earlier (**phase-2-in-app-authoring PLANNED → TASKED.** Used
the existing draft plan `plan-phase-2-in-app-authoring-2026-07-14-8537.md`
(already matched the amended artifacts — approved via `--from`, not
re-drafted) and generated its tasks file,
`tasks-phase-2-in-app-authoring-48d5.md` (`ready`, 18 tasks across 6
phases: ownership data model, dynamic catalog + per-user visibility,
upload trust surface, authoring UI, consent gating, ownership/invites).
Feature register: `phase-2-in-app-authoring` → `tasked`. Committed/pushed
`53b3733`. **Note:** Phase 6 (T016–T018) implements invite-by-link +
co-owner grants — this now overlaps the standalone backlog entry
`catalogue-co-owner-invite-flow` filed a day earlier in the artifacts
sweep below; that entry should probably be retired or merged once Phase 6
lands, rather than planned separately. Not yet implemented — this run
only planned and tasked it. Prior context below.)_

_Updated: 2026-07-15 (**ArDD updated to beta `bdd553e`; constitution bumped
to v1.6.0 (Phase 2 in-app authoring sanctioned); artifacts-sweep backlog
pass added 3 entries.** Committed/pushed `6e3ea49`: constitution.md/
datamodel.md/infrastructure.md/pipeline.md/ui.md amended for Phase 2
in-app authoring (owner-created catalogues/songs from the web UI,
additive to the CLI), plus the two plans that drove it
(`plan-phase-2-in-app-authoring-2026-07-14-8537.md`,
`research-backlog-defrag-slate-analysis-2026-07-15-627c.md`). A
`/ardd-backlog --from-artifacts`-style sweep of all 6 stable artifacts
found 3 documented-but-untracked capabilities, all approved and filed:
`catalogue-co-owner-invite-flow` (ui.md's Ownership/invites section +
datamodel's `grantedVia:'invite'` enum value — schema/migration exist,
no invite generation/redemption code), `host-mandated-bars-per-row-layout`
(infrastructure.md's Tab Rendering section, named explicitly as deferred),
and `latency-compensated-position-extrapolation` (infrastructure.md's
Session & Real-Time Sync section, named explicitly as a deferred
refinement). Feature register now 4 backlogged / 15 implemented. All
three artifact diagrams (`datamodel`, `infrastructure`, `ui`) are stale —
the Phase 2 amendments touched entities/mechanics/UI in all three and none
have been regenerated since. Prior context below.)_

_Updated: 2026-07-14 (**part-mute-toggle SHIPPED, pushed, deployed.**
`tasks-part-mute-toggle-f0d4.md` (`completed`, 6/6), implemented in a
delegated worktree (RED→GREEN per task, all test-first per Principle VII),
fast-forward-merged into `main` at `919a4da`, and pushed — Railway rebuilt
(`index-Crk4cCoz.js` now live). Vetted via `/ardd-research` first
(`research-part-mute-toggle-full-mix-vetting-2026-07-14-6509.md`): every
participant's alphaTab instance already played the **full multi-track mix**
before this feature — alphaTab's `trackIndexes` load parameter scopes
rendering only, not playback — so the feature needed zero server/datamodel/
load-architecture changes. New `client/src/track-mute-preference.ts`
(mirrors `metronome-preference.ts`, keyed per song+track), new
`setEngineTrackMute()` in `playback-engine.ts` wired to alphaTab's own
`api.changeTrackMute()` and applied automatically on `scoreLoaded` (mutes
persist across reload/rejoin), and a new "Mute parts" section in
`SettingsModal.svelte`'s Preferences tab. Self-mute confirmed allowed
(T006), no restriction. Client 87 unit + 113 CT green. Feature register:
`part-mute-toggle` → `implemented` (15 implemented total). `ui.md`'s diagram
is stale (Playback View + Preferences tab additions) — the one open item
this pass. `main` is 0 ahead / 0 behind `origin`. **Live prod behavioral
check (does muting actually silence audio) still pending** — bundle
confirmed deployed, functional click-through not yet done. Prior context
below.)_

> **ARDD update available:** installed `6e7d3cd` (beta channel), latest
> release `v1.0.1-beta.1` — run `/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v1.6.0) | 0 |
| datamodel.md | stable ✅ | 0 |
| pipeline.md | stable ✅ | 1 |
| infrastructure.md | stable ✅ | 1 |
| ui.md | stable ✅ | 1 |
| brand.md | stable ✅ | 0 |

## Open Questions

All three were introduced by the `sync-tabs-to-real-audio` plan and each
is bound to a task that retires it — none is a drifting unknown.

### infrastructure.md
- [OPEN] Infer the host's effective playback rate from observed tick
  advance across reports, or put the host's audio source on the wire?
  Inference preserves the plan's zero-protocol-change property.
  *(Retired by T004.)*

### ui.md
- [OPEN] Does a tempo-divergent song disable the recording source
  outright, or warn only when the session is actually mixed? The latter
  preserves the "everyone on the recording" case, safe at any divergence.
  *(Retired by T020.)*

### pipeline.md
- [OPEN] Is alphatab.net's Media Sync Editor export byte-compatible with
  the stored `FlatSyncPoint[]`, or is a small adapter needed?
  *(Retired by T003.)*

## Cross-Artifact Issues

- [GAP] `ui.md`'s "Connection lost" state vs. `datamodel.md`'s
  `Participant.connectionStatus` share a name for different concepts
  (pre-existing).
- [GAP] `ui.md`/`infrastructure.md` don't mention `installCountInCursorGuard`
  (pre-existing).

## Within-Artifact Issues

None.

## Constitution Compliance

No violations. `part-mute-toggle`'s design is squarely inside Principle V
(uses alphaTab's own `changeTrackMute` API rather than a custom mixing
mechanism) and its 6 tasks are all test-first (Principle VII). The
lyrics-overlay and sign-out fixes (below) were also test-first, no
violations there either.

## Diagrams

All three are **stale ⚠️** as of 2026-07-19 — the `sync-tabs-to-real-audio`
artifact pass touched entities, mechanics, and UI alike.

- `datamodel.md` — **stale ⚠️** (run `/ardd-diagram datamodel`) — gained
  the `FlatSyncPoint` entity and three `CatalogSong` fields.
- `infrastructure.md` — **stale ⚠️** (run `/ardd-diagram infrastructure`)
  — gained the Recording Playback Mode subsection and host-source-keyed
  extrapolation, atop the earlier `lyrics-walk`/audio-warm-up additions.
- `ui.md` — **stale ⚠️** (run `/ardd-diagram ui`) — gained the
  per-participant recording-mode carve-out, atop the Tracks tab and
  icon-based bar controls.

## Code-vs-Artifact Defects

**No defects** — `DEFECTS.md` last checked **2026-07-19** (full
six-artifact pass covering everything through the lyric-dispatch,
beat-widget, and song-switch work). The pass's three cosmetic notes
(scrypt wording, `SONG_UPLOAD_ENABLED` doc omission, one stale code
comment) were fixed in the same session.

## Feedback

**0 open feedback files.** Most recently:
`feedback-icon-refresh-a11y-39d8.md` (7 items) flipped to `planned`,
bound to `plan-icons-a11y-ticker-2026-07-19-2584.md`. Previously: all
three earlier 2026-07-19 UX files
(`feedback-settings-tracks-rows-0501.md`,
`feedback-beat-widget-layout-362c.md`,
`feedback-part-name-instrument-ux-7b1a.md`) flipped to `planned`, bound
to `plan-settings-ux-bundle-2026-07-19-d27d.md`. Previously:
`feedback-song-switch-stale-score-e030.md` flipped to `planned`, bound to
`plan-widgets-gp5-songswitch-2026-07-18-8bee.md`, and:
`feedback-song-switch-stale-score-e030.md`
(2026-07-18) — switching songs left both the tab view and playback audio
on the previous song until a browser refresh; possibly a regression from
the same-day `playback-engine.ts` raw-line wiring, possibly a latent
song-switch race. Will be picked up by the next `/ardd-plan`.

Previously: `feedback-lyrics-dispatch-root-cause-f0f6.md`
flipped to `planned` (both items incorporated), bound to
`plan-lyrics-dispatch-2026-07-18-8090.md`. Previously:
`feedback-audio-output-latency-t014-dfa8.md`
and `feedback-lyrics-ticker-tiro-measure8-9310.md` were the last two open
files — both flipped to `planned`, bound to `plan-99e6-2026-07-18-6d2b.md`
(see Plans & Tasks). All other feedback files are `planned` or `split`
(superseded by their group files, each independently `planned`).

## Feature Backlog

**1 backlogged** · 0 planned · **1 tasked** · **27 implemented** — see
`.project/features/`. `sync-tabs-to-real-audio` moved
`backlogged → tasked` this run (bound to
`plan-sync-tabs-to-real-audio-2026-07-19-62cf.md` /
`tasks-sync-tabs-to-real-audio-cb85.md`). The sole remaining backlogged
entry is `host-mandated-bars-per-row-layout`, which still poses an
unresolved host-vs-participant-vs-both design fork — target it with
`/ardd-plan host-mandated-bars-per-row-layout` when that fork is worth
settling. Newly implemented: `explicit-participant-readiness`
(2026-07-19). Implemented
2026-07-19: `lyrics-ticker-position-preference`,
`mute-all-parts-button`, `count-in-metronome-beat-widget`,
`gp5-raw-lyric-line-extraction`, `catalogue-co-owner-invite-flow`
(closed — scope had shipped as phase-2 Phase 6).
(**superseded — its scope shipped as phase-2-in-app-authoring's Phase 6;
retire by hand**), `host-mandated-bars-per-row-layout`,
`count-in-metronome-beat-widget` (new, filed 2026-07-18 — shared beat
widget for count-in/metronome, design detailed in the 2026-07-18-night
entry above). `latency-compensated-position-extrapolation`,
`hover-long-press-tooltip-for-i`, and `solo-mute-button-per-part` have
since shipped (`implemented`).

## Plans & Tasks

- **Sync tabs to real audio** (`sync-tabs-to-real-audio`) —
  `plan-sync-tabs-to-real-audio-2026-07-19-62cf.md` (`approved`),
  `tasks-sync-tabs-to-real-audio-cb85.md` (**`ready`**, 23 tasks / 5
  phases). Per-participant choice between the alphaTab synth and an
  operator-supplied `recording.mp3`, via alphaTab's native
  `PlayerMode.EnabledBackingTrack` + sync-point model. **Zero server
  protocol, `PlaybackState`, or wire-message change** — a deliberate
  property, since audio source is a client-local preference and the host
  stays clock authority through the same `tickPosition` surface.
  Phases: (1) diagnosis & drift foundation — skewed fixture, failing CT
  test, host-source-keyed `correctDrift`; (2) catalog assets & delivery —
  loader fields, divergence computation, `audio/mpeg` + HTTP Range;
  (3) recording playback engine — player-mode option, mode-aware
  readiness, source preference, engine rebuild on switch; (4) UI —
  source control, carve-outs, divergence guard; (5) end-to-end
  verification, including a regression pass proving synth-only sessions
  are unchanged. Every task carries a test requirement except the two
  explicitly-scoped verification/documentation tasks (T003, T023), per
  Principle VII. Backed by two research docs:
  `research-sync-tabs-to-real-audio-2026-07-19-3394.md` (the original
  vetting) and `research-recording-mode-drift-2026-07-19-b7c2.md` (the
  per-participant drift analysis that shaped the final design).
- **Explicit participant readiness + start negotiation** —
  `plan-explicit-readiness-2026-07-19-841d.md` (`approved`),
  `tasks-explicit-readiness-0580.md` (**`completed`**, 6/6, merged
  `56e9273`; feature `explicit-participant-readiness` flipped
  **`implemented`**). Delivered: `ReadinessStatus` gains `loaded`
  (assets done) vs `ready` (human-confirmed via `ready-set`); Bar
  clock/check ready control + ReadinessBadge clock/check in list rows;
  server-held start negotiation in playback-control (host exempt +
  auto-ready on start, connected-only counting, one pending per
  session, host-disconnect cancel, answers persist on cancel);
  StartNegotiationModals with live count + auto-dismiss. Two-client
  live verification passed all five scenarios. Suites post-merge:
  server 257, client 139 unit + 189 CT — green. The three diagrams
  remain stale (deliberate; run /ardd-diagram when convenient).
- **Icon refresh + a11y + ticker position/size** —
  `plan-icons-a11y-ticker-2026-07-19-2584.md` (`approved`),
  `tasks-icons-a11y-ticker-a10d.md` (**`completed`**, 9/9, merged
  `6d7e53b`; feature `lyrics-ticker-position-preference` flipped
  **`implemented`**). Delivered: tooltip fix (z-index AND a
  live-discovered second root cause — the Bar's torn-edge clip-path
  clipped tooltip descendants; fixed by portaling Tooltip to body);
  icon swaps (bone leave, settings, log-out/log-in in account menu,
  crown host badge with SR-only "Host"); lyrics toggle
  always-visible-but-disabled with per-cause aria/tooltip reasons
  (ui.md reversal recorded); ticker top/bottom position pref
  (persists across reload); desktop font steps 1.5/2/2.75/3.5rem at
  >=1024px (screenshots sent to user); a11y-sweep CT locking the
  accessible-name invariant. Suites: client vitest 134, CT 177 —
  green. Consumed `feedback-icon-refresh-a11y-39d8.md` (7 items).
- **Settings/Bar UX bundle** —
  `plan-settings-ux-bundle-2026-07-19-d27d.md` (`approved`),
  `tasks-settings-ux-bundle-02e8.md` (**`completed`**, 10/10, merged
  `ec8684e`; feature `mute-all-parts-button` flipped **`implemented`**).
  Delivered: `part-display-name.ts` (instrument-prominent extraction,
  15 unit cases) wired into picker/participants/Playing label; new
  `TrackRow.svelte` (one-line grid, bounce marquee on real overflow,
  volume-2/volume-off icon mute, text Solo) + Mute all (batch mute,
  metronome/count-in verified untouched); BeatWidget reordered to
  fixed-width [measure][beat] with stacked number-over-"MES" (beat-count
  x position pixel-identical across the count-in→playback transition,
  129 samples). ui.md revised in T003/T006/T009. Suites: client unit
  131, CT 166, all green post-merge (one pre-existing flaky
  lobby-cursor-debounce CT noted, passes standalone). Consumed all
  three earlier 2026-07-19 UX feedback files.
- **Configurable empty-session TTL (12h)** —
  `plan-session-empty-ttl-2026-07-19-ce83.md` (`approved`),
  `tasks-session-empty-ttl-1b53.md` (**`completed`**, 5/5, merged
  `ab317ce`). Hardcoded 30s empty-session destroy replaced by env
  `SESSION_EMPTY_TTL_MS` (default 12h, user decision) threaded into
  SessionStore; pause-on-empty guard in the disconnect path;
  absent-host rejoin now schedules host reassignment. Server suite 238
  green; live-checked with an injected 35s TTL (survives past 30s,
  rejoin resumes paused, post-TTL rejoin gets session-not-found).
  infrastructure.md lifecycle text updated with the rationale (cites
  `research-session-expiration-2026-07-19-9b87.md`). Consumed
  `feedback-session-expiry-question-8f83.md`.
- **Beat widget + GP5 lyric extraction + song-switch race fix** —
  `plan-widgets-gp5-songswitch-2026-07-18-8bee.md` (`approved`),
  `tasks-widgets-gp5-songswitch-a046.md` (**`completed`**, 9/9, merged
  `a2df7f6` 2026-07-19; both features flipped **`implemented`**).
  Delivered: (1) **song-switch race fixed** — not a timing race:
  `playback-engine.ts`'s EngineState carried no song identity, so the
  old api/score/synth survived a song change; fixed with `songId`
  teardown+rebuild plus reactive `dropEngineIfSongChanged()` from
  App.svelte, and a second leak (destroyed engines left the old lyrics
  overlay DOM alive) fixed via `overlay.destroy()`; CT regression test;
  live-verified (immediate + normal switch, ticker follows). (2) **GP5
  reader** (`gp5-lyrics.ts`, header walk + cp1252, null on deviation) +
  `readRawLyricsLineAuto` dispatch; finding: Supermassive's GP5 lyrics
  block is EMPTY (all five lines zero-length, no per-beat lyrics
  either) so it stays on lrclib-passthrough `.lrc` per plan OQ3 — any
  future lyric-bearing GP4/5 gets the corrected dispatch automatically.
  (3) **Beat widget** — `beat-clock.ts` (real time-signature numerators
  + localTempoAtTick), `BeatWidget.svelte` (alternating fill sweep,
  countdown/count-up + Measure label, gating matrix), wired via
  `beatWidgetState` off `playerPositionChanged` with self-scheduled
  count-in countdown; live-verified all modes. Suites: client vitest
  116, client CT 157, pipeline 33 — all green. ui.md/pipeline.md
  sections from the plan run stand as written.
- **Creep-class dispatch semantics follow-up** —
  `plan-creep-dispatch-2026-07-18-8a7c.md` (`approved`),
  `tasks-creep-dispatch-3477.md` (**`completed`**, 8/8, merged `7a41ee5`).
  Final dispatch semantics (empirically fitted, 16k rule-set search
  against 13 user anchors): non-empty chunks skip rests + tie
  destinations + grace beats + shift-slide-out beats; whitespace `+`
  holds consume one singable beat emitting nothing; empty chunks consume
  any beat. Live-verified: Creep bar 18 "In a beautiful world", "You"
  flips at exactly tick 59040 (bar 16), final "here" on the last vocal
  note (bar 89) — no dry-out; TIRO bar 14 "be" regression green. Suites:
  shared 19, pipeline 25, client 108, server 230. The one-bar-early
  bridge residual (She's/ru-/She @60-62) was then fixed by a
  **data patch to the Creep `.gp` source** (lyric-line rebalance, no
  note surgery) — recorded in `docs/catalog-patches.md` (committed;
  catalog/ is gitignored, so that doc is the reapply record if the file
  is ever restored) — after which ALL 13 anchors verify (She's@61,
  ru-@62, She@63 confirmed on the shipped code path post-regen).
  Upstream alphaTab issue draft updated (per-beat `_skipApplyLyrics`
  bypass + full 4-rule divergence), still unfiled pending user OK.
  Diagnosis-led: Phase 1 finds the missing beat-skip rule (alphaTab's
  unexplained no-chunk skip at Creep bar 16 tick 60480 is the lead) and
  decides `+`-hold semantics empirically; Phase 2 amends the shared
  dispatcher test-first (TIRO ground truths as regression gate); Phase 3
  regenerates the 4 GP7/8 songs and live-verifies Creep (bar 16 "You"
  mid-measure entry, no ~bar-84 dry-out). Consumes
  `feedback-creep-lyrics-misalignment-0911.md` (now `planned`). Next:
  `/ardd-implement`.
- **Lyrics dispatch root fix + correctDrift pause fix** —
  `plan-lyrics-dispatch-2026-07-18-8090.md` (`approved`),
  `tasks-lyrics-dispatch-0f0e.md` (**`completed`**, 13/13, merged
  `e37437d`, live-verified — see the night-8 entry).
  Shared GP-semantics dispatcher (`packages/shared/src/lyrics-dispatch.ts`,
  test-first from 3 verified TIRO ground truths), pipeline `lyricsRawLine`
  publish + corrected `.lrc` + regen for the 4 GP7/8 lyric songs, client
  overlay switch-over (legacy `walkSyllables` fallback), `correctDrift`
  pause-fix reshape (raw comparison while paused, keeps seek-while-paused
  propagation), close-out of tasks-99e6 + optional upstream alphaTab
  issue. Supersedes plan-99e6 below. Working tree carries the uncommitted
  F002 draft fix in `client/src/playback-sync.ts`(+test) that T011
  reshapes. Next: `/ardd-implement`.
- **Lyrics ticker tie-boundary fix + audio-latency feedback close-out** —
  `plan-99e6-2026-07-18-6d2b.md` (**`superseded`** by
  plan-lyrics-dispatch above), `tasks-99e6-e76f.md`
  (**`in-progress`, 2/5**). Merged to `main` (delegated worktree,
  `merge_policy: auto`). **T001** (regression test for a tie-across-barline
  scenario in `packages/shared/src/lyrics-walk.ts#walkSyllables`) passes
  against current code — rules out the walk/dedup misattribution
  hypothesis. **T002** (trace of `client/src/lyrics-overlay.ts`'s
  `updateActiveSyllable` tick-compare loop) found it structurally
  correct — no off-by-one, no stale index caching, no lookahead;
  documented inline. **T003 blocked** — replaying both candidate sites
  against the real "TIRO" catalog file's measure 8/9 data did not
  reproduce the reported early-highlight at all (the real vocals-track
  beat the feedback describes isn't even a tie destination), so neither
  declared candidate site shows a live bug. Blocker note appended to the
  tasks file at Phase 2 naming two out-of-scope follow-up leads: the
  catalog file may have changed since the original repro was filed, or
  the real mechanism is upstream of both candidate sites — most likely
  the newly-shipped `latency-compensated-position-extrapolation`
  (`client/src/playback-sync.ts`, forwards `tickPosition` for non-host
  participants), which this plan's Scope explicitly didn't cover.
  **T004/T005 not attempted** (both depend on T003). Next step: either
  re-run T003 against a fresh live repro of "TIRO" to confirm the bug
  still reproduces as described, or `/ardd-plan` a follow-up scoped to
  `playback-sync.ts`'s extrapolation path instead.
- **Lobby cursor modes** — `tasks-lobby-cursor-modes-0bea.md`
  (`in-progress`, 11/12, plan-lobby-cursor-modes-2026-07-03.md).
  Pre-existing, unrelated to this session's work — untouched here, flagged
  for visibility only.
- **Lyrics-timing fixes, mute-parts tab, playback-stutter investigation** —
  `plan-1619-2026-07-17-39c6.md` (`approved`), `tasks-1619-1185.md`
  (`completed`, 20/20). Merged `8603fa9`. Shared `packages/shared/src/
  lyrics-walk.ts` syllable walk (tie-aware dedup) now unifies pipeline +
  client; timestamp-based `.lrc` line-boundary placement replaces
  word-count proportion; Mute-parts control moved to its own Settings
  tab, one row per part; audio-warm-up (`api.player.output.activate()`)
  wired in for the playback-start stutter. F001 ticker-latency research
  inconclusive (no public API, no multi-device access) — follow-up filed
  as `feedback-audio-output-latency-t014-dfa8.md`. `pnpm -r test` +
  53 client CT tests all green post-merge.
- **Bottom bar icons + lyrics-toggle relocation** —
  `plan-bottom-bar-icons-2026-07-17-fdd5.md` (`approved`),
  `tasks-bottom-bar-icons-47a6.md` (`completed`, 5/5). Merged (concurrent
  session). "Toggle lyrics" moved into the persistent bar; play/pause/
  stop/settings/leave-session controls became icon-based
  (`lucide-svelte`); fixed the lyrics-off background-strip bug.
- **Lyrics ticker (centering fix)** — `tasks-lyrics-ticker-75dd.md`
  (`completed`, 9/9). T004's 2026-07-04 live-verification failure is now
  re-verified passing (see the dated note above) — the actual fix landed
  separately in `tasks-lyrics-pre-singing-e09e.md` T004; this file just
  confirms the carry-over behavior is correct.
- **Lyrics pre-singing placeholder** — `tasks-lyrics-pre-singing-e09e.md`
  (`completed`, 9/9). T008 (live-browser check of the pre-singing "…"
  placeholder centering/transition) verified passing 2026-07-17.
- **Per-participant part mute toggle** — `tasks-part-mute-toggle-f0d4.md`
  (`completed`, 6/6). **Merged to `main` at `919a4da`, pushed, deployed**
  (`index-Crk4cCoz.js`). New `track-mute-preference.ts` (mirrors
  `metronome-preference.ts`), new `setEngineTrackMute()` wired to
  alphaTab's `changeTrackMute()` and applied on `scoreLoaded` (persists
  across reload), new "Mute parts" section in `SettingsModal.svelte`'s
  Preferences tab. Self-mute allowed. Zero server/datamodel changes.
  Client 87 unit + 113 CT green. **Bundle confirmed live; functional
  click-through (does muting actually silence a track) not yet verified.**
- **Lyrics overlay timing + display fixes** — `tasks-7f0f-4f2d.md`
  (`completed`, 5/5). **Merged to `main` at `ecca7ee`, pushed, deployed,
  live-verified in a real session** (F006 inline count-in dots, F003/F004
  gap-indicator clearing, F005 no pre-highlight, F002 single scroll region
  all confirmed visually; F001 timing offset covered by the automated test
  suite). Client 82 unit + 105 CT green.
- **Sign-out event-binding + false-banner fix (REAL sign-out cause)** — shipped
  `9478c55`, deployed, **verified live** end-to-end by the user. `AccountMenu`
  `onclick={() => onSignOut()}`; `ConnectionBanner` gated on `wsClient`.
  Client 81 unit + 102 CT green.
- **Stale-session typed `session-not-found` (F001, d509)** —
  `tasks-signout-stale-session-terminal-d509.md` (`completed`, 5/5). Merged
  `55ba3dc`. Kept as defensive hardening — was NOT the sign-out blocker.
- **Stale-session WS reconnect storm + `/me` hardening (F002, F003)** —
  `tasks-signout-ws-reconnect-storm-c60d.md` (`completed`, 6/6). Merged `5857634`.
- **Sign-out verify-via-`/me` (F001)** — `tasks-signout-verify-via-me-7739.md`
  (`completed`, 3/3). Merged `0f8a3db`, deployed `d5f8c8f3`.
- **Sign-out reload race** — `tasks-signout-reload-race-e126.md` (`completed`).
  Merged `a683a97`, deployed `3305a830`.
- **Reachable account controls** — `tasks-reachable-account-controls-1787.md`
  (`completed`). Merged `318b7d2`.
- **Hide locked catalogues** — `tasks-hide-locked-catalogues-6009.md`
  (`completed`). Merged `a1e8446`.
- **Accounts Phase 1** — `tasks-accounts-phase-1-02f7.md` (`completed`, 20/20).
  Merged `e2747b2`.

## Deploy status (production)

Canonical public domain: **https://sts.ty-pe.com** (custom domain; the
Railway-assigned `sync-tab-scroll.up.railway.app` also resolves).

- **OAuth sign-in — WORKING (verified 2026-07-14).** Both providers 302 to their
  auth endpoints with the correct prod `redirect_uri`
  (`https://sts.ty-pe.com/auth/{github,google}/callback`), PKCE + state present;
  GitHub sign-in confirmed end-to-end by the user. **Discrepancy to confirm:**
  the *deployed* Google client_id is `29801536638-b983…`, but earlier deploy
  notes referenced `607753971873-…` — make sure the callback URI is
  registered on the `29801536638` client.
- **Postgres / DATABASE_URL — done.** `terraform apply` wired
  `DATABASE_URL = ${{Postgres.DATABASE_URL}}`; `prevent_destroy` active; `/me`
  returns `{"accountsEnabled":true,...}`.
- **Sealed vars — pushed** (`*_OAUTH_CLIENT_ID/SECRET`, `SESSION_COOKIE_SECRET`,
  `PUBLIC_BASE_URL`). Optional cleanup: the inert legacy `GOOGLE_CLIENT_ID` /
  `GITHUB_CLIENT_ID` Railway vars can be deleted.
- **Lyrics-overlay + sign-out + part-mute-toggle — all deployed**
  (`index-Crk4cCoz.js` is the current live bundle, superseding both prior
  builds referenced above). Node 22 image (`4d4a6bf`) and the shared-
  package deploy fix (`a9e7e73`) are both live and confirmed Online as of
  this entry.

## Recommended next step

**`/ardd-implement`** — `tasks-sync-tabs-to-real-audio-cb85.md` is
`ready` (23 tasks / 5 phases). Note Phase 1 is diagnosis-first by design:
T001–T002 build a deliberately-skewed fixture and a *failing* CT test
that measures whether corrective seeks actually stutter, before any UI is
built on the sync model. Don't let an eager run skip past that into
Phase 3.

Then, in rough priority order:

1. **Push** (commits ahead of origin; the push triggers the prod rebuild
   that ships the song-switch fix + beat widget), then **re-upload the
   catalog volume** (Supermassive re-ingest) per the README procedure.
   Still pending separately: ear-check Last Nite + Teenagers (guide in
   tasks-creep-dispatch-3477.md's T006 note), file the updated upstream
   alphaTab issue (awaits user OK), retire
   `catalogue-co-owner-invite-flow` by hand.
2. Regenerate the two stale diagrams: `/ardd-diagram infrastructure`,
   `/ardd-diagram ui` (both touched by plan-1619's Phase 1/4/5 and the
   bottom-bar-icons plan).
3. **Live check of `plan-1619`'s deliverables** — none of it has been
   exercised in a real browser yet, only unit/CT tests: confirm the
   Tracks tab renders correctly, `.lrc` timing actually looks right on
   "Time Is Running Out" in a live session, and whether the new
   `warmUpAudioOutput()` call actually reduces the reported playback-start
   stutter in practice.
4. **Retire `catalogue-co-owner-invite-flow`** by hand — its scope shipped
   as phase-2-in-app-authoring's Phase 6.
5. **Live check of Phase 2 in-app authoring** — no manual/live verification
   has happened yet, only the automated suite. Create a catalogue, add a
   song (real `.gp` file, real pipeline extraction), generate + redeem an
   invite link, confirm co-owner visibility, in a real running session.
6. **`/ardd-defects`** — refresh against everything since 2026-07-12
   (part-mute-toggle, phase-2-in-app-authoring, plan-1619,
   bottom-bar-icons, the two deploy fixes, Node 22 upgrade).
7. **Live prod check of part-mute-toggle** — open the Preferences tab in a
   real session, confirm "Mute parts" lists every available part and
   actually silences the muted track's audio.
8. **Optional:** confirm the Google `29801536638` client's redirect URI is
   registered; `/ardd-update` to move off the beta channel gap.
