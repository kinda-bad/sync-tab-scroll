---
status: approved
branch: lyrics-pre-singing-1fa6
created: 2026-07-04
features: []
---

# Lyrics overlay pre-singing state

## Goal

Fix the lyrics ticker's initial-render jump (left-aligned, then snaps to
centered on the first syllable — `tasks-lyrics-ticker-75dd.md` T004's
FAILED live-verification finding) by giving it an explicit, centered
pre-singing placeholder state instead of an untransformed default.

## Scope

In scope: `client/src/lyrics-overlay.ts`'s handling of the
"before any syllable has activated" state (`activeIndex === -1`), and the
CSS for the new placeholder element. Out of scope: any other state
transition in the ticker (mid-song pause/resume keeps showing the
last-active syllable, centered, exactly as today — not touched by this
plan); the ticker's scroll/centering *mechanism* itself (already fixed and
confirmed live, see `tasks-lyrics-ticker-75dd.md` T004's sibling T007);
and the ticker's z-index/background-contrast fix (separate concurrent
fix, already landed in `motifs.css`).

## Technical Approach

**Design decision (resolving the feedback item's "no active playback
state or cursor" phrase, made explicit here rather than left ambiguous):**
"no active playback state or cursor" means specifically the pre-first-
syllable state (`activeIndex === -1` in `lyrics-overlay.ts`'s current
code) — i.e., before the song's lyrics have started at all (intro/count-in
portion). It does **not** mean every pause: once a real syllable has
activated at least once (`activeIndex >= 0`), pausing mid-song keeps
showing that last-active syllable centered, unchanged from today's
behavior. The placeholder is a one-way, one-time pre-roll state — it
never reappears once real lyrics begin, even if playback is later paused
and resumed. `ui.md` doesn't currently document any pre-singing state at
all (confirmed by reading its Playback View lyrics-overlay section), so
this is new design territory, not a reversal of documented behavior.

**Implementation:** add one permanent placeholder element
(`<span class="lyric-syllable lyrics-placeholder">…</span>`, literal
ellipsis character) as `.lyrics-track`'s first child, inserted before the
real syllable spans, in `createLyricsOverlay()`. Treat it as a virtual
"index -1" entry rather than a separate code path:

- `centerActiveSyllable()`: when `activeIndex < 0`, center on the
  placeholder element instead of early-returning (today's code just
  `return`s, leaving the track at its untransformed, left-aligned default
  — this is the exact bug). Call `centerActiveSyllable()` once
  synchronously at overlay-creation time (today it's only ever invoked
  from `updateActiveSyllable`/the resize handler, so the very first paint
  before any tick event has fired is left uncentered — this is the "snaps
  the moment the first syllable is due" half of the bug).
- `updateActiveSyllable()`: give the placeholder the `at-highlight` class
  whenever `activeIndex === -1` (matching how real syllables get
  highlighted), and permanently remove it (`display: none` or
  `classList.remove`, one-way) the first time `activeIndex` transitions to
  `>= 0` — it never needs to reappear per the decision above, so no need
  to re-add the class conditionally on every call.

**CSS** (`client/src/styles/motifs.css`, alongside the existing
`.lyric-syllable.at-highlight` rule): the placeholder reuses
`.lyric-syllable`'s base styling as-is; no new rule needed beyond ensuring
it participates in the same `at-highlight` color role so it visually
matches how a real syllable highlights.

## Phase Breakdown

### Phase 1: Placeholder + initial centering [artifacts: ui]
- Add the placeholder span to `createLyricsOverlay()`'s track construction
  in `client/src/lyrics-overlay.ts`.
- Update `centerActiveSyllable()` to center on the placeholder when
  `activeIndex < 0`, and call it once synchronously right after the
  overlay/track/spans are constructed (before any `playerPositionChanged`
  event has fired).
- Update `updateActiveSyllable()` to toggle `at-highlight` on the
  placeholder for `activeIndex === -1`, and remove/hide it permanently on
  first transition to a real index.
- Regression-test via the existing `lyrics-overlay.ct.spec.ts` harness:
  add a case asserting the placeholder is present, highlighted, and
  horizontally centered immediately after mount (tick position 0, before
  any `drive()` call) — this is the CT-provable half of what
  `tasks-lyrics-ticker-75dd.md` T004 could only check by manual/live
  browser inspection previously, and is exactly the scenario that failed
  live.
- Manual verification in a real browser (this plan's version of T004):
  confirm the ticker shows a centered, highlighted "…" from the moment
  playback view opens (even before Start), and that it transitions
  smoothly to the first real syllable with no visible left-alignment
  jump.

### Phase 2: Artifact revision [artifacts: ui]
- Revise `ui.md`'s Playback View lyrics-overlay paragraph to document the
  new pre-singing placeholder state and the one-way-transition rule
  (never reverts to the placeholder once real lyrics begin, even across a
  mid-song pause). Bump `last_updated`, set `diagram_status: stale` if not
  already.

## Complexity Tracking

None — this reuses the existing `centerActiveSyllable`/`activeIndex`
mechanism rather than introducing a parallel state machine; the
placeholder is treated as a virtual list entry, not a new concept.

## Open Questions

None outstanding — the "no active playback state or cursor" ambiguity in
the source feedback item is resolved above as a plan decision (pre-first-
syllable only, one-way transition).

## Production Annotation Summary

None — no shortcuts taken; this is a complete fix within the existing
architecture.
