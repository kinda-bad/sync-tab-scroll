---
plan: plan-lyrics-only-view-fix-2-2026-07-06.md
generated: 2026-07-06
status: in-progress
---

# Tasks

## Phase 1: Reproduce
- [x] T001 [artifacts: ui, infrastructure] Write a Playwright CT test
  (test-first, per constitution Principle VII) using the existing
  `HeadlessPlayerHarness.svelte` test-harness pattern (see
  `headless-player.ct.spec.ts` for precedent) that: mounts the headless
  player against a fixture song with a real `.lrc` file, simulates
  playback advancing past the first non-empty `.lrc` line's timestamp,
  and asserts `.full-lyrics-view`'s `getComputedStyle(...).display` is
  not `'none'` and its `textContent` becomes non-empty. Confirm this test
  fails against current code. Capture and record in the tasks file (as a
  note under this task) *how* it fails — e.g. `scoreLoaded`/
  `playerPositionChanged` never fire at all for the headless `api`
  (pointing at the render-gate hypothesis in the plan's Technical
  Approach), vs. events do fire but `textContent`/`display` still don't
  reflect it (pointing at something else, e.g. the CSS conflict alone
  being insufficient to explain full invisibility) — this determines
  Phase 2's actual scope.

  **NOTE (T001 finding, 2026-07-06):** Wrote
  `client/src/full-lyrics-view.ct.spec.ts`, driving the real
  `ensurePlaybackEngine` headless-lyrics-part wiring (via
  `PlaybackEngineHarness`, extended here with `isLyricsPart`/`lyricsLrc`
  props — chosen over literally reusing `HeadlessPlayerHarness.svelte`
  because that harness doesn't wire up `.full-lyrics-view`/the lrc-line
  matching at all; `PlaybackEngineHarness` already calls the exact
  production `ensurePlaybackEngine` this bug lives in). Also added the
  missing `../src/lyrics.css` import to `client/playwright/index.ts` (it
  loaded `tokens.css`/`motifs.css` but not `lyrics.css` — a CT-harness gap
  that would have made the CSS-conflict half of this investigation
  untestable in CT at all) and a copy of App.svelte's conflicting scoped
  `.full-lyrics-view` rule inside `PlaybackEngineHarness.svelte`'s own
  `<style>` block (Svelte scoping is per-component, so this is the only
  way to reproduce the same specificity fight in a harness instead of
  mounting the whole `App.svelte` tree).

  **The test, written exactly to the plan's literal Phase 1 acceptance
  criteria (`display` not `'none'` AND `textContent` non-empty), does
  NOT fail against current code — it passes immediately, no fix
  applied.** `scoreLoaded` and `playerPositionChanged` both fire
  normally for the headless (permanently `display:none`) `api`, and
  `.full-lyrics-view`'s `textContent` updates correctly once a line's
  timestamp is crossed. **This refutes hypothesis 1** (the
  render-gate/tick-pipeline stall theorized in the plan's Technical
  Approach #1) — alphaTab's playback/position-tracking pipeline is not
  gated behind the same "real sized render happened" check that gates
  visual rendering; only the visual render itself is skipped
  (`[AlphaTab][Rendering] AlphaTab skipped rendering because of width=0`
  logs confirm the skip still happens, but harmlessly, since the headless
  path never wants a visual render anyway).

  I also went further than a CT-only repro and ran a real, throwaway
  two-participant **e2e** test (real production build, real server, host
  on the instrument part + a second participant on Lyrics, real
  `page.getByRole('button', { name: 'Start' })` playback start — same
  shape as `e2e/multi-participant.spec.ts`'s existing
  host-vs-lyrics-participant pattern) to check whether the CT repro was
  itself a test-harness artifact. It also did **not** reproduce "nothing
  visible": a screenshot showed the correct lyric line ("TEST") rendered
  in the expected amber color, legible, roughly centered. (Aside,
  unrelated to this bug: my first attempt at this e2e run gave a false
  404 for `lyrics.lrc` because Playwright's `reuseExistingServer` had
  silently reattached to an orphaned dev-server process left running on
  port 6081 by a *different*, since-deleted git worktree from an
  unrelated earlier session — confirmed via `git worktree list` no
  longer listing it, then killed. Once that stale process was cleared,
  the real server correctly served `lyrics.lrc` with 200 and the e2e
  repro attempt gave the clean "no bug found" result above.)

  **What *is* confirmed as a real, live defect** (a second test in the
  same spec file): `.full-lyrics-view`'s computed `display` resolves to
  `'block'` (App.svelte's scoped rule wins on specificity), never
  `lyrics.css`'s intended `'flex'` — hypothesis 2 is real, exactly as the
  plan's Technical Approach documented. But per my empirical testing it
  is **not** a total-invisibility bug on its own: with the fixture song's
  short one-word lines, `text-align: center` (uncontested, still applies
  under `display:block`) visually centers the text closely enough that a
  casual look doesn't read as broken — only the flex-based *vertical*
  centering is lost, which could look more obviously wrong with longer or
  multi-line text, but "nothing visible" does not describe what I
  observed.

  **Conclusion for Phase 2:** neither documented hypothesis explains a
  total-blackout "nothing is visible" symptom on this branch's current
  code, using every reproduction tool available in this task (CT harness
  extended to exercise the real production wiring, and a real two-
  participant e2e run against a real production build). The CSS
  specificity conflict (hypothesis 2) is a real, confirmed defect worth
  fixing regardless (T004) — it's a maintainability hazard and a genuine,
  if lesser, layout bug — but T003's headless-container fix (hypothesis
  1) is not needed: the render-gate stall it would guard against does not
  happen. Per this task's own instructions, skipping T003 with this note
  rather than forcing an unneeded fix.

  **Flag for the user:** I could not reproduce the actual reported
  symptom (feedback-lyrics-only-view-6386: "nothing is visible") with any
  tool available to me. This may mean the bug is real but needs a
  reproduction condition my fixtures/tooling don't cover (e.g. a song
  whose first `.lrc` line isn't at `00:00`, a longer real session, a
  specific real browser/production-deployment difference, or a race this
  synthetic timing doesn't hit), or that it was already fixed by
  something else, or that the original report was itself imprecise about
  what "nothing visible" meant (e.g. describing the lost vertical
  centering, not true invisibility). I did not edit `ui.md`/`infrastructure.md`
  myself per this task's rules — flagging this discrepancy for a
  `/ardd-refine` pass rather than guessing further.
- [x] T002 Live-verify in a real browser (this project's
  `browser-verify-alphatab-quirks` practice) with a real two-participant
  session: one participant on an instrument part, one on Lyrics. Confirm
  the CT reproduction in T001 matches real observed behavior, not just a
  test-harness artifact.

  **NOTE (2026-07-06):** Already covered as part of T001's writeup above
  (the throwaway two-participant e2e run, real Chromium via Playwright's
  `e2e` project — real production `vite build`/`preview`, real server,
  two separate isolated browser contexts, host on the instrument part +
  member on Lyrics, real `Start` click) — screenshot showed the correct
  lyric text ("TEST") legible and roughly centered, no repro of "nothing
  visible". I additionally attempted a genuine interactive check via
  `claude-in-chrome` (real, non-Playwright Chrome, two real tabs) as a
  higher-fidelity cross-check beyond Playwright automation, running the
  client/server on ports 7500/7080 (not 6000/6080/6001/6081, to avoid
  colliding with any other real dev session or e2e run). That attempt was
  blocked by a recurring `Cannot access a chrome-extension:// URL of
  different extension` error from the browser tooling itself (unrelated
  to this app — happened on plain textbox clicks/screenshots on the
  Landing page, before any app logic ran) that didn't resolve across
  several retries and fresh tabs, so I did not get a human-eyeball-style
  two-tab session working. Flagging this as **not manually verified by a
  human** — the e2e Playwright run above is the strongest live-browser
  evidence I could produce; a real two-person manual pass (or someone
  else's real Chrome session without this extension conflict) is still
  worth doing before fully trusting this finding.

## Phase 2: Fix
- [x] T003 [artifacts: infrastructure] Based on T001's findings: if the
  headless player's `scoreLoaded`/`playerPositionChanged` events are
  confirmed not firing (or firing incorrectly) due to the container's
  `display: none`, change `createHeadlessPlayer`
  (`client/src/headless-player.ts`) to position its container off-screen
  with a real non-zero size instead of `display: none` — e.g.
  `container.style.position = 'absolute'; container.style.left =
  '-99999px'; container.style.width = '800px'; container.style.height =
  '600px';` — so alphaTab's render/tick pipeline sees a real, sized
  element while it still never appears in the visible viewport. Skip
  this task (mark done with a note) if T001's findings point elsewhere
  instead.

  **SKIPPED (note, 2026-07-06):** T001 confirmed `scoreLoaded` and
  `playerPositionChanged` both fire correctly for the headless
  `display:none` container — the render-gate hypothesis this task exists
  to fix does not hold (see T001's note). Changing
  `createHeadlessPlayer`'s container to an off-screen-but-sized element
  would be a speculative, unneeded change with no confirmed defect behind
  it, so leaving `client/src/headless-player.ts` as-is per this task's own
  instruction to skip when T001 points elsewhere.
- [ ] T004 [artifacts: ui] [parallel] Consolidate the `.full-lyrics-view`
  CSS split: remove the duplicate/conflicting rule from `App.svelte`'s
  scoped `<style>` block (`.full-lyrics-view { display: none; }` /
  `.full-lyrics-view.visible { display: block; }`), and move the
  `display`/`.visible` toggle into `client/src/lyrics.css` alongside its
  existing styling for the same class, changing its visible-state
  `display` to be driven by the same `.visible` class Svelte still
  applies from `App.svelte`'s markup (`class:visible={hasPart &&
  isLyricsPart}` stays in the markup; only the CSS rule's *location*
  changes, so there is exactly one file declaring this element's full
  style instead of two files each partially overriding the other).
- [ ] T005 Make T001's CT test pass.

## Phase 3: Regression coverage & verification
- [ ] T006 [artifacts: ui] Add a permanent CT test (distinct from T001's
  reproduction, or promote/rename it to a permanent spec file e.g.
  `full-lyrics-view.ct.spec.ts`) covering: `.full-lyrics-view` becomes
  visible and shows the correct line text as simulated playback position
  crosses each `.lrc` line boundary in order, using a fixture song with a
  real multi-line `.lrc` file — mirroring `lyrics-overlay.ct.spec.ts`'s
  existing pattern for the in-tab overlay.
- [ ] T007 Live-verify in a real browser, two-participant session again:
  the lyrics-only participant sees line text appear and advance in sync
  with the instrument participant's tab playback, in both light and dark
  theme.
- [ ] T008 Run the full test suite (server + client vitest, CT, e2e).
