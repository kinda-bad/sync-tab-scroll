---
status: draft
branch: lyrics-only-view-fix-2
created: 2026-07-06
features: []
surfaced-defects: [3b0d8e26, 3c1509ab]
---

# Plan: Lyrics-only view still renders nothing (round 2)

## Goal

Fix the "Lyrics part selected" full-screen lyrics view (`ui.md` Playback
View), which per `feedback-lyrics-only-view-6386.md` still shows nothing —
despite `plan-lyrics-only-view-fix-2026-07-04.md` having already targeted
this exact symptom once and merged.

## Scope

**In scope:**
- Root-cause and fix why `App.svelte`'s `.full-lyrics-view` element never
  displays any text for a lyrics-only participant.
- The CSS rule duplication between `App.svelte`'s scoped
  `.full-lyrics-view` display toggle and the global `lyrics.css`
  `.full-lyrics-view` styling rule (found during investigation — see
  Technical Approach).
- Regression coverage so this can't silently break a third time.

**Out of scope:**
- The in-tab lyrics ticker overlay (`.lyrics-overlay`, instrument-part
  view) — confirmed working, unaffected by this bug, already covered by
  its own CT suite (`lyrics-overlay.ct.spec.ts`).
- Any change to `.lrc` parsing/pipeline generation (`pipeline.md`) —
  `lrc-parser.ts`'s format handling and the pipeline's `.lrc` output are
  not implicated by the investigation below.

## Technical Approach

**Investigation findings** (read directly from current code, not
assumed):

1. **Primary suspect — headless player never renders, so it may never
   tick.** `createHeadlessPlayer` (`client/src/headless-player.ts`) mounts
   a real alphaTab instance into a container with `container.style.display
   = 'none'`, permanently. `playback-engine.ts` already documents (its own
   comment, ~line 99) a *known* alphaTab quirk for the ordinary visible
   tab-container case: alphaTab skips a render entirely when its container
   is `width=0`/invisible at render time, and **never re-renders on its
   own** once later shown — which is exactly why `renderedWhileVisible` /
   `renderNowVisible()` exist as a workaround for that path. The headless
   player has no equivalent workaround, because by design it's never
   supposed to become visible — but if alphaTab's playback/position-
   tracking pipeline (not just its visual render) is gated behind that same
   "did a real, sized render happen" check, a permanently-`display:none`
   container would mean `scoreLoaded`/`playerPositionChanged` never fire
   correctly for the headless instance at all. That would explain "nothing
   ever shows, regardless of song" — a total pipeline stall, not a styling
   or timing-off-by-one bug.
2. **Secondary, confirmed CSS defect** (real, but likely not sufficient on
   its own to fully explain "nothing visible"): `App.svelte`'s own scoped
   `<style>` block declares `.full-lyrics-view { display: none; }` /
   `.full-lyrics-view.visible { display: block; }`. The global
   `client/src/lyrics.css` separately declares `.full-lyrics-view { display:
   flex; align-items: center; justify-content: center; height: 400px;
   font-size: 2.5rem; ...}`. Svelte's compiled scoping attribute gives
   `App.svelte`'s rule higher specificity, so `display` always resolves to
   `App.svelte`'s value (`none`/`block`), never `lyrics.css`'s `flex` —
   meaning even if text does land in the element, it never gets the
   centered-flex layout `lyrics.css` intended (font-size/color/height
   still apply, since those properties aren't contested). A duplicate,
   partially-conflicting rule split across two files is itself a
   maintainability defect worth consolidating into one place, independent
   of whether it's the root cause of total invisibility.

**Fix approach**: reproduce first (Phase 1) to confirm which hypothesis
(or both) is real before changing anything — per constitution Principle
VII, and because "guess and patch" already failed once on this exact bug.
If hypothesis 1 confirms, the fix is to make the headless container
visible-but-invisible-to-the-user instead of `display:none` — e.g.
absolutely-positioned off-screen (`position: absolute; left: -99999px;`
with an explicit non-zero `width`/`height`) rather than `display: none`,
which keeps a real layout box (satisfying whatever alphaTab's render gate
checks) while still never appearing in the visible viewport. This mirrors
how `browser-verify-alphatab-quirks` already documents that alphaTab's
automation/rendering behavior doesn't match naive assumptions and must be
verified live. Consolidate the CSS duplication into a single location
(`lyrics.css`, since that's the one that already carries the intended
final styling) regardless of which hypothesis confirms.

## Phase Breakdown

### Phase 1 — Reproduce
- [ ] Write a Playwright CT test (test-first, per constitution Principle
  VII) using the existing `HeadlessPlayerHarness.svelte` / equivalent
  harness pattern that asserts `.full-lyrics-view`'s rendered
  `getComputedStyle(...).display` is not `'none'` and its `textContent`
  becomes non-empty once a `.lrc` line's timestamp is reached during
  simulated playback. Confirm this test fails against current code,
  and capture *how* it fails (element never visible vs. visible-but-empty)
  to confirm which of the two Technical Approach hypotheses is the actual
  cause — this determines Phase 2's scope.
- [ ] Live-verify in a real browser (this project's
  `browser-verify-alphatab-quirks` practice) with a real two-participant
  session: one participant on an instrument part, one on Lyrics — confirm
  the CT reproduction matches real behavior, not just a test-harness
  artifact.

### Phase 2 — Fix
- [ ] If hypothesis 1 confirmed: change `createHeadlessPlayer`
  (`client/src/headless-player.ts`) to position its container off-screen
  with a real non-zero size (e.g. `position: absolute; left: -99999px;
  width: 800px; height: 600px;`) instead of `display: none`, so alphaTab's
  render/tick pipeline sees a real, sized element.
- [ ] Consolidate the `.full-lyrics-view` CSS split: move the
  `display: none` / `.visible { display: block }` toggle rule into
  `lyrics.css` alongside its existing styling (changing `display: flex`'s
  visible-state to also be driven by the same `.visible` class, so there
  is exactly one place declaring this element's full style, not two files
  each partially overriding the other).
- [ ] Make Phase 1's CT test pass.

### Phase 3 — Regression coverage & verification
- [ ] Add a permanent CT test (distinct from Phase 1's throwaway
  reproduction, or promote it) covering: `.full-lyrics-view` becomes
  visible and shows the correct line text as simulated playback position
  crosses each `.lrc` line boundary, using a fixture song with a real
  `.lrc` file (mirroring `lyrics-overlay.ct.spec.ts`'s existing pattern for
  the in-tab overlay).
- [ ] Live-verify in a real browser, two-participant session again: the
  lyrics-only participant sees line text appear and advance in sync with
  the instrument participant's tab playback, in both light and dark theme.
- [ ] Run the full test suite (server + client vitest, CT, e2e).

## Complexity Tracking

None — no new principle deviations. The off-screen-positioning fix (if
needed) reuses the same "give alphaTab a real sized element" pattern this
codebase already established for the visible tab-container path
(`renderedWhileVisible`/`renderNowVisible`), just applied to the headless
path instead of introducing a new mechanism.

## Open Questions

None blocking. Phase 1 determines which of the two documented hypotheses
(or both) is the actual cause before Phase 2 commits to a specific fix —
this is investigation ordering, not an unresolved design decision.

## Production Annotation Summary

None — no production shortcuts introduced. This closes a real,
user-facing defect.
