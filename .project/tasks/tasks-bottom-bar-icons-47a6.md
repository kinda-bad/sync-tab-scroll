---
plan: plan-bottom-bar-icons-2026-07-17-fdd5.md
generated: 2026-07-17
status: in-progress
---

# Tasks

## Phase 1: Icon foundation

- [x] T001 [artifacts: ui] Add `lucide-svelte` as a dependency in `client/package.json` (`pnpm add lucide-svelte --filter client` or workspace equivalent). Extend `client/src/components/Button.svelte` with an `icon` prop (a Svelte component, e.g. a Lucide icon) and an `iconOnly` boolean prop: when `iconOnly` is true, render only the icon (no visible `{label}` text) and set `aria-label={label}` plus `title={label}` on the `<button>` for accessibility/hover-tooltip. Write a Playwright CT spec (`client/src/components/Button.ct.spec.ts`, following this project's established Playwright CT pattern per `[[browser-test-strategy-playwright]]`) asserting: (a) normal (non-`iconOnly`) buttons still render visible text as before, (b) an `iconOnly` button renders no visible text but exposes the correct `aria-label`. Write and confirm this test fails before implementing the `iconOnly`/`icon` support (constitution Principle VII).

## Phase 2: Bar control icon swap

- [x] T002 [artifacts: ui] [parallel] In `client/src/App.svelte`'s `controls()` snippet, replace the Settings, Start/Pause-Resume/Stop, and Leave-session `<Button>` calls with `iconOnly` buttons using Lucide icons: a cog icon for Settings, tape-recorder-style icons for Start (play), Pause/Resume (pause/play), and Stop (square), and an exit-door icon (e.g. `LogOut` or `DoorOpen`, whichever reads clearest) for Leave session. Each button keeps its existing `label` text as the `aria-label`/tooltip via T001's `iconOnly` support. Update or add a Playwright CT spec for `App.svelte`'s bar controls (or extend the existing Bar-related CT spec if one covers this markup) asserting each control is present, clickable, and carries the correct `aria-label`; write and confirm it fails before making the swap.

## Phase 3: Lyrics toggle relocation and fix

- [x] T003 [artifacts: ui] [parallel] Move the "Toggle lyrics" control out of `client/src/views/Playback.svelte` (removing its standalone `<Button>` and the now-unused `isLyricsPart`-gated wrapper there) and into `client/src/App.svelte`'s `controls()` snippet as an `iconOnly` button (e.g. a `Mic2` or `AudioLines` Lucide icon, whichever reads clearest), gated on `!isLyricsPart` exactly as the original was, wired to the same `toggleOverlay` call. Update the affected Playwright CT spec(s) (Playback/Bar) to assert the toggle now renders in the bar, not in the Playback view body, and is absent when the participant's part is `lyrics`; write and confirm the updated assertions fail against the pre-move code before making the move.
- [x] T004 [artifacts: ui] Fix the lyrics-off bug: toggling lyrics off currently leaves the in-tab strip's background band visible even though the syllable text disappears. Drive this live in a real browser (per this project's established live-verification pattern for CSS/visual bugs) to find the actual root cause — check whether the duplicate unscoped `.lyrics-overlay` rule in `client/src/lyrics.css` (loaded separately from the real strip styling in `client/src/styles/motifs.css`) is winning the cascade over `lyrics-overlay.ts`'s inline `display: none`, or whether `.lyrics-overlay-container`'s `position: relative` wrapper (`client/src/styles/motifs.css`) is itself painting something visible. Write a Playwright CT spec asserting that after `toggleOverlay()` sets `showOverlay` to `false`, the `.lyrics-overlay` element (and the whole visible strip band) is not rendered/visible (e.g. assert on computed `display`/bounding box, not just the syllable spans' text). Write and confirm this test fails against the current code before applying the fix.

## Phase 4: Artifact sync

- [x] T005 [artifacts: ui] Update `.project/artifacts/ui.md`'s Lobby View and Playback View sections: describe the lyrics toggle as living in the persistent bar (not a standalone Playback-view control), and describe the bar's Settings/Start-Pause-Resume-Stop/Leave-session controls as icon-based (cog, tape-recorder-style transport icons, exit-door icon respectively) with accessible labels. Stamp `last_updated` and `diagram_status: stale` via `.claude/skills/ardd-scripts/ardd-state.sh stamp .project/artifacts/ui.md last_updated <today>` and `... diagram_status stale`. No test requirement — documentation-only change (constitution Principle VII's stated exception).
