---
plan: plan-c75f-2026-07-23-5638.md
generated: 2026-07-23
status: in-progress
---

# Tasks

## Phase 1: Input Validation Hardening

- [x] T001 [artifacts: infrastructure, datamodel] Write a failing server test in a new `server/src/input-validation.test.ts` asserting a shared `validateDisplayName`/`validateActivationKey`-style function (to be created at `server/src/input-validation.ts`) rejects control characters and HTML tags, enforces a length cap, and passes through Unicode/emoji unchanged. Confirm it fails (module doesn't exist yet).
- [x] T002 [artifacts: infrastructure] Implement `server/src/input-validation.ts` to make T001 pass: strip/reject control characters and HTML special characters, cap length, allow Unicode/emoji. Addresses feedback-input-sanitization-hardening-7a9a F001.
- [x] T003 [artifacts: infrastructure] [parallel] Write a failing integration test extending an existing session-create/join handler test (e.g. alongside `server/src/connections.test.ts` patterns) asserting `session-create`, `session-join`, and `catalogue-unlock` handlers reject/sanitize invalid `displayName`/key input via the new validator; confirm it fails, then wire the validator into those three handlers to make it pass.

## Phase 2: Join-Code Click-to-Copy

- [x] T004 [artifacts: ui] Write a failing Playwright CT spec (new `client/src/join-code-copy.ct.spec.ts`) asserting the Bar identity area's join-code chip is clickable and writes the code to the clipboard, showing a transient inline confirmation. Confirm it fails (no such behavior exists yet).
- [x] T005 [artifacts: ui] Implement the click-to-copy behavior on the Bar's join-code chip (client component owning the persistent Bar identity area) to make T004 pass, including the transient confirmation UI. Addresses feedback-join-code-click-to-copy-4971 F001.

## Phase 3: Remembered Display Name

- [x] T006 [artifacts: ui] Write a failing Playwright CT spec (new `client/src/remembered-display-name.ct.spec.ts`) asserting the Landing View's create/join "Your name" inputs pre-fill from a signed-in user's provider-profile display name when no local (`session-persistence.ts`-stored) value exists yet, and do NOT override an existing local value. Confirm it fails.
- [x] T007 [artifacts: ui] Implement the pre-fill in the Landing View's create/join forms to make T006 pass. Implements `remember-logged-in-display-nam`.

## Phase 4: Help/Info/About Nav Panel

- [x] T008 [artifacts: ui] [parallel] Write a failing Playwright CT spec (new `client/src/help-info-about-panel.ct.spec.ts`) asserting a new `?` icon control in the persistent nav bar opens a modal with three tabs (About, Info, Help), the About tab rendering the alphaTab/Songsterr shoutout links, the GitHub source link (`https://github.com/kinda-bad/sync-tab-scroll`), and the sponsor link (`https://github.com/sponsors/moui72`). Confirm it fails.
- [x] T009 [artifacts: ui] Create the Help/Info/About modal component and its `?` nav-bar trigger to make T008 pass, following the existing icon-only Bar control pattern (accessible name, tooltip) per ui.md's Accessibility rule. Implements `help-info-about-panel-in-nav-b`.

## Phase 5: Host-Mandated Bars-Per-Row Layout

- [x] T010 [artifacts: datamodel] Write a failing server test asserting `Session.hostBarsPerRow` defaults to `null` and resets to `null` on song change, following the existing `spotlightMode`/`lobbyCursorTick` reset-on-song-change test pattern. Confirm it fails (field doesn't exist).
- [x] T011 [artifacts: datamodel, infrastructure] Add `Session.hostBarsPerRow: number | null` to the server-side session model and wire its song-change reset to make T010 pass.
- [ ] T012 [artifacts: infrastructure] Write a failing server test asserting a new host-only `bars-per-row-set` WS message updates `Session.hostBarsPerRow` and broadcasts `session-state`, and is rejected for a non-host sender, following the existing host-authorization-checked message pattern (e.g. `host-remove-participant`). Confirm it fails, then implement the handler to make it pass.
- [ ] T013 [artifacts: ui] [parallel] Write a failing Playwright CT spec (new `client/src/bars-per-row-layout.ct.spec.ts`) asserting the Session tab's host-only "Layout" control sends `bars-per-row-set` and a personal per-participant bars-per-row preference exists in the Preferences tab, persisted client-side like the theme/metronome preferences. Confirm it fails.
- [ ] T014 [artifacts: ui] Implement the Session-tab host control and Preferences-tab personal preference to make T013 pass, and apply the pin-shadows-preference logic at alphaTab renderer construction (`client/src/tab-renderer.ts` or the relevant renderer module), pinned when `hostBarsPerRow` is set, falling back to the personal preference otherwise. Implements `host-mandated-bars-per-row-layout`.

## Phase 6: Host Early-Stop Point

- [ ] T015 [artifacts: datamodel] Write a failing server test asserting `Session.earlyStopTick` defaults to `null` and resets to `null` on song change, mirroring T010's pattern. Confirm it fails.
- [ ] T016 [artifacts: datamodel, infrastructure] Add `Session.earlyStopTick: number | null` to the server-side session model and wire its song-change reset to make T015 pass.
- [ ] T017 [artifacts: infrastructure] Write a failing server test asserting a new host-only `early-stop-set` WS message updates `Session.earlyStopTick` and broadcasts `session-state`, rejected for non-host senders. Confirm it fails, then implement the handler to make it pass.
- [ ] T018 [artifacts: infrastructure] Write a failing server test asserting that once the host-reported `tickPosition` passes `Session.earlyStopTick`, the server auto-triggers the existing host-Stop transition (`playbackState.status` flip) for the session. Confirm it fails, then implement the enforcement (reusing the existing Stop transition path) to make it pass.
- [ ] T019 [artifacts: ui] [parallel] Write a failing Playwright CT spec (new `client/src/early-stop-point.ct.spec.ts`) asserting the Session tab's host-only "Early stop point" control sends `early-stop-set`, and the Playback View visually de-emphasizes tab content past the stop tick for every participant. Confirm it fails.
- [ ] T020 [artifacts: ui] Implement the Session-tab host control and Playback View de-emphasis rendering to make T019 pass. Implements `host-set-early-stop-point-for`.

## Phase 7: Recording-Mode Metronome Unlock

- [ ] T021 [artifacts: ui] [parallel] Write a failing Playwright CT spec (extend `client/src/recording-uniform-sync.ct.spec.ts` or add a sibling spec) asserting the personal Metronome preference toggle is no longer force-disabled while `Session.playbackSource === 'recording'`, and still drives the beat widget's visual component. Confirm it fails.
- [ ] T022 [artifacts: ui] Remove the force-disable of the Metronome toggle in recording mode and wire it to the beat widget's visual-only path to make T021 pass. Investigate whether alphaTab (given upstream #1961) can layer an audible click over a playing recording; if feasible, implement it under this same toggle; if not, document the audio limitation inline in the UI (e.g. a hint near the toggle) and leave ui.md's existing open-question note as the record of the constraint. Addresses feedback-recording-mode-metronome-lock-reconsidered-c415 F001.

## Phase 8: e2e Suite Diagnosis

- [ ] T023 [parallel] Bisect `client/e2e/host-controls.spec.ts`'s timeout-shaped failure between the 2026-07-19 known-good commit and current `main` to determine whether the red state is environmental (harness/config drift) or a genuine product regression. No new test required for this diagnostic task — record findings in the task's completion notes.
- [ ] T024 If T023 found a genuine regression: write a failing test isolating it (if not already covered by `host-controls.spec.ts` itself), confirm it fails, then fix the regression. If T023 found an environmental cause: fix the harness/config issue directly and confirm `host-controls.spec.ts` passes locally under the same conditions CI uses. Addresses feedback-e2e-suite-red-on-main-7b3f F001.

## Phase 9: Defect Fixes

- [ ] T025 [defect: bf07f912] [parallel] At `client/src/tab-renderer.ts:51`, correct the `settings.core.scriptFile` comment/code so it accurately reflects that this line is only a fallback for a synchronous Worker-construction error (not the mechanism keeping the audio player worker alive), per infrastructure.md's Font & Worker Setup section. No test required — this is a documentation/comment-accuracy fix; if the current comment is also functionally misleading code (not just prose), add a regression test only if a real behavioral drift is found during the fix.
- [ ] T026 [defect: b16e2ab1] [artifacts: ui] [parallel] Write a failing Playwright CT spec asserting the Tracks tab's `mute-all-parts-button` behavior matches ui.md's documented spec (single action muting every part's MIDI audio at once via batch `api.changeTrackMute()`, count-in/metronome clicks staying audible, personal/client-local per-(song,track) persistence). Confirm it fails against current behavior, then fix the drift to make it pass.
