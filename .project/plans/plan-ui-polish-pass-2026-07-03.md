---
status: approved
branch: ui-polish-pass
created: 2026-07-03
features: []
---

# Plan: UI Polish Pass

## Goal

Fix three Playback-view rendering/interaction bugs (missing cursor, dead
click-to-seek, misplaced lyrics overlay) and address two UX issues (bar
fill contrast, song/part selection moving into a modal) surfaced by manual
verification.

## Scope

**In scope:**
- Playback cursor visibility (alphaTab's native `.at-cursor-bar`/
  `.at-cursor-beat` overlay, per `ui.md`'s documented mechanism).
- Click-to-seek (host-only, paused-only, per `ui.md`).
- In-tab lyrics overlay CSS positioning (overlay-on-notation vs. current
  stacked-below layout).
- Persistent Bar's dark-mode fill-color contrast against its surroundings.
- Moving song/part selection from inline Lobby content into a modal,
  opened from the nav bar, auto-opening whenever no song or no part is
  selected.

**Out of scope (declined by user, not incorporated into this plan):**
- Removing the hazard-stripe signature fill
  (`feedback-ui-polish-pass-e180.md`'s `## Reconsidered` item). User
  confirmed keeping it as-is; `brand.md`'s Signature Element section is
  unchanged. The dark-mode bar-fill-contrast fix below must work
  *alongside* the existing hazard-stripe pattern, not replace it — e.g. a
  distinct base/background color under the stripes, not a different fill
  mechanism.
- Any other DEFECTS.md-tracked drift not raised in this feedback pass.

## Technical Approach

**Cursor + click-to-seek — revised after implementation-time
investigation disproved the original hypothesis.** The original
hypothesis (deprecated `settings.player.enablePlayer` no-op'ing,
leaving `playerMode`/`enableCursor`/`enableUserInteraction` effectively
off) was checked empirically against a real alphaTab instance and
**disproven**: `enablePlayer = true` correctly maps to
`playerMode: EnabledAutomatic`, and `enableCursor`/`enableUserInteraction`
are both already `true`. The cursor DOM elements (`.at-cursors` >
`.at-cursor-bar`/`.at-cursor-beat`/`.at-selection`) genuinely exist with
real positioning styles immediately after render.

**Actual root cause, confirmed empirically:** alphaTab's `createCursors()`
builds these elements as bare `<div>`s with *only* positioning/transform
inline styles — no color, background, or opacity. alphaTab ships no
companion CSS at all; styling the cursor is documented as the consuming
app's responsibility. This app has never added any `.at-cursor-bar`/
`.at-cursor-beat`/`.at-selection` CSS (confirmed: zero matches anywhere
in `client/src/`). Computed styles on a live-rendered cursor confirm
`background-color: rgba(0, 0, 0, 0)` (fully transparent) on all three —
not a contrast problem, no fill at all. `brand.md` already earmarks
`--riot` for exactly this use ("CTAs, cursor, 'live'/active state") — the
design intent exists, it was simply never wired into CSS. This also
plausibly explains the click-to-seek complaint as a side effect, not a
separate bug: seeking (`enableUserInteraction`) already works, but with
no visible cursor a user gets no feedback that a seek landed anywhere,
reading as broken.

**Fix**: add CSS for `.at-cursor-bar`/`.at-cursor-beat`/`.at-selection`
(wherever the app's tab-container-adjacent styles already live) using
`--riot`/`--hazard`, with opacity tuned visually against
`brand-colors.ts`'s `darkTabColors` (staff-line/glyph colors) — not a
settings or `tab-renderer.ts` logic change.

**Lyrics overlay positioning**: `client/src/lyrics-overlay.ts` currently
appends its `.lyrics-overlay` div as a plain sibling inside the tab
container with no positioning CSS, so it stacks below the rendered SVG
in normal document flow instead of overlaying it. Fix is CSS
(`position: absolute` over the container, which itself needs
`position: relative`), not a change to the overlay's DOM-construction or
tick-driving logic in `lyrics-overlay.ts` — `motifs.css`/component
styles own this, not the module itself. If true overlay-on-notation
turns out not to be feasible once attempted (e.g. z-index conflicts with
alphaTab's own SVG layering), stop and discuss alternative placements
with the user per the feedback's own caveat, rather than shipping a
different placement unannounced.

**Bar dark-mode fill contrast**: `client/src/components/Bar.svelte`
currently sets `background: var(--surface)` — the exact same token
`brand.md`'s palette table assigns to "bar/card/panel background"
generally, so in dark mode the bar is visually identical to the panels
behind/around it. Fix is a new, dedicated token (e.g. `--bar-surface`)
distinct from `--surface`, applied only to the Bar, not a change to the
hazard-stripe fill itself (declined above).

**Song/part-selection modal**: `client/src/views/Lobby.svelte` currently
renders the catalog list and part list inline at the top of the Lobby
view unconditionally. This becomes a new modal component (reusing
existing `Button`/`ListRow` components per `brand.md`'s established
patterns), triggered by a new nav-bar control and auto-opened via a
reactive condition (`!session.selectedSong || !selfParticipant.selectedPart`)
in `App.svelte` or `Lobby.svelte`, wherever view-level reactive state
already lives (`App.svelte`'s existing `$: hasPart` pattern is the
precedent to follow).

## Phase Breakdown

### Phase 1: Cursor + click-to-seek investigation and fix
- ~~Confirm whether `enablePlayer` is genuinely a no-op~~ — checked and
  disproven; settings were already correct. [addresses feedback:
  cursor-not-visible, click-to-seek-broken]
- Add CSS coloring `.at-cursor-bar`/`.at-cursor-beat`/`.at-selection`
  using `--riot`/`--hazard`, tuned against `darkTabColors` — the actual
  confirmed root cause (alphaTab ships these with zero color/opacity;
  the app never styled them).
- Verify in a real browser: cursor is now visibly colored and tracks
  the playing beat; host can click-to-seek while paused (likely already
  worked — just imperceptible without a visible cursor). If seeking is
  still broken independent of cursor visibility, that's genuinely
  separate — diagnose independently rather than assuming a shared cause.
- **[artifacts: ui]** No revision needed — the documented mechanism
  (alphaTab's native cursor overlay) was accurate; only its styling was
  missing, which `ui.md` doesn't get into at that level of detail.

### Phase 2: Lyrics overlay positioning
- Add `position: relative` to the tab container and
  `position: absolute` (plus appropriate inset/z-index) to
  `.lyrics-overlay` so it renders on top of the rendered notation.
  [addresses feedback: lyrics-overlay-misplaced]
- Verify visually in a real browser with an instrument part that has a
  lyrics-bearing track. If overlay-on-notation isn't achievable cleanly,
  stop and present alternatives to the user before proceeding, per the
  feedback's own caveat.

### Phase 3: Bar dark-mode fill contrast
- Add a `--bar-surface` token (dark and light theme values) distinct
  from `--surface` to `client/src/styles/tokens.css`; apply it to
  `Bar.svelte`'s background. [addresses feedback: bar-fill-contrast]
- **[artifacts: brand]** Add the new token to `brand.md`'s palette table
  with a value and rationale, alongside the existing `--surface` entry.
- Verify visually in dark mode that the bar now reads as distinct from
  surrounding panels, without altering the hazard-stripe fill on top of
  it.

### Phase 4: Song/part-selection modal
- Build a new modal component for song/part selection, reusing existing
  `ListRow`/`Button` components.
- Add a nav-bar control (in the persistent Bar) to open/close it.
- Wire auto-open: whenever `!session.selectedSong` or the current
  participant has no `selectedPart`, the modal opens automatically;
  closing it manually is allowed once both are set (does not force it
  to stay open after selection completes).
- Remove the now-redundant inline catalog/part-list rendering from
  `Lobby.svelte`'s top section — participant list, lobby cursor, and
  Spotlight-mode controls remain inline in Lobby as before; only
  song/part selection moves.
- **[artifacts: ui]** Revise `ui.md`'s Lobby View section to describe
  the modal (trigger, auto-open condition) instead of inline rendering.
- Verify in a real browser: fresh session auto-opens the modal; closing
  it after selecting both song and part works; reopening via the nav
  control works.

## Complexity Tracking

None — a new token and a new modal component both follow existing
patterns (`tokens.css`'s existing token set, `Button`/`ListRow` reuse);
no new architectural layer.

## Open Questions

None outstanding for the in-scope items. The hazard-stripe removal
question is resolved (declined) and out of scope, not an open question
for this plan.

## Production Annotation Summary

None anticipated.
