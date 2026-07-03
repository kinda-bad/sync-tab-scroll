---
status: approved
branch: settings-modal-redesign
created: 2026-07-03
features: []
---

# Plan: Settings Modal Redesign

## Goal

Move the Lobby view's participant list and lobby-cursor/Spotlight controls
out of the main viewport into a cog-opened, tabbed settings modal
(Participants / Settings) that also introduces the app's first real
in-app theme toggle; keep song/part selection as its own separate modal;
make "Start" close every open modal without touching the lyrics overlay;
and move the hazard-tape strip to the top of the viewport instead of
sandwiching it between the nav bar and the main content.

## Scope

**In scope:**
- A new `SettingsModal.svelte` component with two tabs — **Participants**
  (participant list + readiness, host's remove-participant control, lobby
  cursor set/clear, Spotlight-mode toggle — everything `Lobby.svelte`
  currently renders inline) and **Settings** (a dark/light theme toggle —
  the app's first real in-app theme control; today theme is only
  switchable via `data-theme` in test harnesses/Storybook, never from the
  running app). [feedback: settings-modal-redesign-7e73 UX #2, Reconsidered #1]
- A new settings-cog control in the persistent nav bar (`Bar.svelte`)
  that opens/closes this modal, alongside the existing "Song & part"
  control. Song/part selection stays exactly as it is today — its own
  separate, non-tabbed modal — **not** folded in as a third tab, because
  it has forced-open/non-dismissible-until-set gating tied to session
  readiness that doesn't fit a modal a user can freely dismiss.
  [feedback: settings-modal-redesign-7e73 UX #2]
- "Start" (`App.svelte`'s `startPlayback()`) closes both the song/part
  modal and the new settings modal if either is open, without touching
  `playback-engine.ts`'s lyrics-overlay visibility state (`showOverlay`/
  `toggleOverlay()`) at all — that's a separate on-tab display toggle, not
  a modal, and isn't even reachable from `App.svelte`'s own state today.
  [feedback: settings-modal-redesign-7e73 UX #1]
- Reposition the hazard-tape strip (`HazardBar.svelte`, currently rendered
  inside `Bar.svelte`'s bottom-pinned `.bar-wrap`, directly above the nav
  bar) to a separate, independently fixed strip pinned to the **top** of
  the viewport. [feedback: settings-modal-redesign-7e73 Reconsidered #2]
- **[artifacts: ui]** Revise `ui.md`'s Lobby View section to describe the
  new modal structure and the resulting (much smaller) routed Lobby view
  body — see Open Questions below, this is the one design point not
  fully nailed down yet.
- Update `client/e2e/multi-participant.spec.ts` and
  `client/e2e/host-controls.spec.ts`, both of which currently interact
  with the lobby-cursor/Spotlight/remove-participant controls assuming
  they're inline in the Lobby body — these need a "open the settings
  modal via the cog" step added before those interactions.

**Out of scope, deferred (not forgotten):**
- Any new theme beyond dark/light (brand.md already anticipates this via
  its `[data-theme='...']` extensibility note, but no third theme is
  requested here).
- Persisting the settings-modal's *open/closed*/active-tab state across a
  refresh — only the theme *preference* itself needs to persist (so a
  returning user doesn't see a startup flash of the wrong theme); which
  tab was last open, or whether the modal itself was open, resets on
  reload same as everything else UI-transient today.
- Any change to `SongPartModal.svelte`'s own forced-open/dismissible
  logic — untouched by this plan.

## Technical Approach

**Tabbed settings modal**: `SettingsModal.svelte` wraps the existing
generic `Modal.svelte` shell (same reuse pattern `SongPartModal.svelte`
already established), adding its own tab strip (two buttons, "Participants"
/ "Settings", one active at a time via local component state defaulting
to "Participants"). The Participants tab's content is lifted verbatim
from `Lobby.svelte` (participant `ListRow`s + `ReadinessBadge`, lobby
cursor input/Set/Clear buttons, Spotlight-mode toggle button) — same
"read the existing view first, lift faithfully" approach
`SongPartModal.svelte` used for the song/part picker
(`tasks-ui-polish-pass-b013.md` T011). The Settings tab is new: a single
dark/light toggle control.

**Theme control — revised mid-implementation, real pre-existing control
found**: the original version of this plan stated `playback-engine.ts`'s
`toggleTheme()` was dead code and that the app had no existing in-app
theme control. Both were wrong — `client/src/views/Playback.svelte`
already has a live "Light mode / Dark mode" button that calls
`toggleTheme()` and sets `document.documentElement.dataset.theme`
directly, inline, in the Playback view's own controls. It just doesn't
persist across a refresh, and — crucially — the settings-cog this plan
adds is Lobby-only, so simply deleting `Playback.svelte`'s button without
another fix would leave Playback view with no theme control at all, a
real regression. Resolved with the user: the settings-cog (and
`SettingsModal`) becomes reachable from **both** the Lobby and Playback
views (not Lobby-only as originally stated), and `Playback.svelte`'s
ad-hoc button/local `theme` state/direct `toggleTheme()`/`dataset.theme`
wiring is removed entirely, replaced by the same shared, persisted
Settings-tab control described below — one control, reachable
everywhere, instead of two overlapping ones (only one of which
persisted). This plan still introduces a new small module,
`client/src/theme.ts` (mirroring `session-persistence.ts`'s shape: a
`StoredTheme` type, a `loadStoredTheme()`/`persistTheme()` pair against
`localStorage`, and an `applyTheme(theme)` that sets
`document.documentElement.dataset.theme`), called on app startup
(persisted preference, default `'dark'` if none
stored — matching `tokens.css`'s existing default) and from the Settings
tab's toggle. `applyTheme()` also calls `playback-engine.ts`'s existing
`toggleTheme()`-adjacent logic — refactored slightly from a toggle into
an explicit setter (e.g. rename to `setEngineTheme(theme)`) so the global
control can drive it directly instead of only flipping it — keeping the
document-level palette and the tab-notation colors in sync from one
control, per brand.md's existing "toggling theme anywhere in the app
switches both at once" intent.

**Start closes modals**: `App.svelte` already holds `songPartModalOpen`
as local state; add a sibling `settingsModalOpen` local state for the new
modal (owned the same way, toggled by the new cog button). `startPlayback()`
sets both to `false` before sending the `playback-control`/`start`
message. No change to `playback-engine.ts`'s overlay state at all —
satisfies the "but not the lyrics overlay" requirement by simply never
touching it, not by adding an exclusion branch.

**Hazard strip repositioning**: `Bar.svelte` currently renders `<HazardBar
fill={progress} />` as the first child inside `.bar-wrap` (`position:
fixed; bottom: 0`), so it visually sits directly above the nav bar,
between it and the main viewport. Split this into two independently
`position: fixed` elements within the same component (still both driven
by the same `progress` prop, so `Bar.svelte`'s public API doesn't
change): a new top-pinned wrapper for `HazardBar` (`top: 0`), and the
existing bottom-pinned `.bar-wrap` for the nav bar itself, no longer
containing `HazardBar`. `App.svelte`'s `.app-content.with-bar` padding
logic (which currently accounts for "the Bar's own height + the hazard
strip above it" in one combined `padding-bottom`) needs re-splitting into
a `padding-top` (for the now-top-pinned hazard strip) and an unchanged
`padding-bottom` (for the bar alone, hazard strip no longer part of its
height).

**Resulting Lobby view body**: once the participant list, lobby cursor,
and Spotlight controls move into the settings modal's Participants tab,
`Lobby.svelte`'s own routed body would otherwise have nothing left to
render — the tab/lyrics preview area (`.engine-containers`/
`.full-lyrics-view` in `App.svelte`) already renders independently of
which view is active, gated only on `hasPart`. Resolved with the user:
`Lobby.svelte`'s body becomes a single state-dependent hint line, one of
four mutually exclusive cases (checked in this order):

1. Not host, and the session has no song selected yet: *"Waiting for the
   host to pick a song."*
2. Host, and the session has no song selected yet: *"Pick a song to get
   started."* plus a pointer to the existing "Song & part" nav-bar
   control (the one that opens the song/part modal).
3. A song is selected but this participant has no part yet: *"Select
   your part."* plus the same pointer to the "Song & part" control.
4. Both are set (the ready-to-start state): *"{readyCount} of
   {totalCount} ready — waiting for host to start."* (the one state
   `Lobby.svelte`'s body is actually visible for real, rather than
   behind the song/part modal's — still-in-scope, unchanged — forced-
   open backdrop, since the modal only becomes dismissible once both are
   set).

Cases 1-3 render behind the song/part modal's existing forced-open,
non-dismissible backdrop (unchanged scope, see above) — the hint text is
reachable/visible in principle (e.g. during the dismiss-then-reopen
window, or if that gating logic ever changes later) rather than
literally dead code, even though in today's normal flow the modal
usually covers it immediately. All four cases read directly off
`clientStore`'s existing reactive fields (`session.selectedSong`,
`hasPart`, `isHost`, `readyCount`/`totalCount` — all already derived in
`App.svelte` today, or trivially mirrored into `Lobby.svelte`).

## Phase Breakdown

### Phase 1: Tabbed settings modal + Participants tab
- Build `SettingsModal.svelte` (wraps `Modal.svelte`, adds a 2-tab strip,
  defaults to Participants), lifting `Lobby.svelte`'s participant list,
  remove-participant control, lobby-cursor input/Set/Clear buttons, and
  Spotlight-mode toggle into the Participants tab verbatim.
- Add the settings-cog control to `Bar.svelte`'s controls area (or
  `App.svelte`'s `controls()` snippet, matching wherever "Song & part"
  already lives) wired to a new `settingsModalOpen` state in `App.svelte`.
- Remove the now-migrated content from `Lobby.svelte`, replacing it with
  the 4-case state hint described in Technical Approach (not-host/no-song,
  host/no-song, song-but-no-part, both-set-ready-count).
- Write a test first (Principle VII): extend `client/e2e/host-controls.spec.ts`
  and `client/e2e/multi-participant.spec.ts` — both currently click lobby-
  cursor/Spotlight/remove-participant controls assuming they're inline;
  add an "open settings via cog" step before those interactions. Confirm
  these fail against the current inline-Lobby-rendering code, then pass
  once the modal exists.
- **[artifacts: ui]** Revise `ui.md`'s Lobby View section per the Open
  Questions resolution below. Bump `last_updated`, `diagram_status: stale`.

### Phase 2: Theme control (Settings tab)
- Add `client/src/theme.ts` (`StoredTheme`, `loadStoredTheme()`/
  `persistTheme()` against `localStorage`, `applyTheme(theme)` setting
  `document.documentElement.dataset.theme`). Call `applyTheme(loadStoredTheme()
  ?? 'dark')` once on app startup (`main.ts`).
- Refactor `playback-engine.ts`'s `toggleTheme()` into an explicit
  `setEngineTheme(theme: Theme)` (same guard for `!state`/`isLyricsPart`,
  just taking the target value instead of flipping); `theme.ts`'s
  `applyTheme()` calls it too, so the tab-notation colors and the global
  CSS palette change together from one control.
- Add the dark/light toggle UI to `SettingsModal.svelte`'s Settings tab,
  calling `theme.ts`'s `applyTheme()`/`persistTheme()`.
- Write a test first (Principle VII): a CT test (new
  `client/src/theme.ct.spec.ts`, or extend an existing harness) asserting
  `applyTheme('light')` sets `document.documentElement.dataset.theme` to
  `'light'` and persists it such that `loadStoredTheme()` returns it back.
  Confirm it fails before `theme.ts` exists.
- Manual verification in a real browser: toggle theme in the Settings tab
  and confirm both the app's CSS palette and the rendered tab notation's
  colors change together; refresh the page and confirm the choice
  persisted.

### Phase 3: Start closes modals
- Add `settingsModalOpen = false` alongside the existing
  `songPartModalOpen` handling in `App.svelte`'s `startPlayback()`.
- Write a test first (Principle VII): extend `client/e2e/single-participant.spec.ts`
  or `host-controls.spec.ts` — open the settings modal, click Start,
  assert the modal is no longer visible. Confirm it fails against current
  code (no such closing logic exists), then passes.

### Phase 4: Hazard strip repositioning
- Split `Bar.svelte`'s template/styles into a top-pinned `HazardBar`
  wrapper and the existing bottom-pinned nav-bar wrapper, both driven by
  the same `progress` prop.
- Update `App.svelte`'s `.app-content.with-bar` padding rule: split the
  combined bar+hazard-strip `padding-bottom` into a `padding-top` (new
  top-pinned hazard strip) and a `padding-bottom` (bar alone).
- Write a test first (Principle VII): a CT test asserting the hazard-
  strip element's computed `top` is `0px` and the nav-bar element's
  computed `bottom` is `0px` simultaneously (i.e. genuinely two
  independent fixed elements, not nested). Confirm it fails against the
  current single-`.bar-wrap` structure.
- Manual verification in a real browser: confirm the hazard-tape strip
  now renders at the very top of the viewport, and the main content
  (Lobby/Playback body, tab notation) has enough top padding that it's
  not obscured by it.

### Phase 5: Full suite verification
- Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and
  `pnpm --filter client test:e2e`. Confirm every test from Phases 1-4
  passes alongside the existing suite, with no regressions. Report final
  test/file counts.

## Complexity Tracking

None — every new piece reuses an existing pattern already established
elsewhere in this codebase: `theme.ts` mirrors `session-persistence.ts`'s
localStorage-persistence shape; `SettingsModal.svelte` reuses the generic
`Modal.svelte` shell `SongPartModal.svelte` already established; the tab
strip inside it is a small, self-contained piece of local component
state, not a new app-wide routing concept.

## Open Questions

None outstanding — resolved with the user before finalizing (see Lobby
body state hint below).

## Production Annotation Summary

None anticipated.
