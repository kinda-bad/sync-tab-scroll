---
status: approved
branch: 4435
created: 2026-07-17
features: []
surfaced-defects: []
---

# Plan: Bottom bar icons and lyrics-toggle placement

## Goal

Move the lyrics toggle into the persistent bottom bar, fix it to fully hide the in-tab lyrics strip (not just the syllable text), and replace the bar's text-label controls (play/pause/stop, settings, leave session) with icons from a newly-adopted icon library, to reclaim bottom-bar space and give it a clearer visual language.

## Scope

**In scope:**
- Adopt `lucide-svelte` as the client's icon library (Principle V: check library idioms before building custom SVGs).
- Move "Toggle lyrics" (currently a standalone `<Button>` above the tab in `Playback.svelte`) into the persistent Bar's controls section in `App.svelte`, alongside Song & part / Settings / Start-Pause-Stop / Leave session.
- Fix the lyrics-off bug: toggling lyrics off must hide the entire in-tab strip (background band), not just leave a syllable-less strip visible.
- Swap play/pause/stop bar buttons for tape-recorder-style icons (play▶, pause⏸, stop■).
- Swap the Settings button for a cog icon.
- Swap "Leave session" for an exit-door icon.
- Extend `Button.svelte` (or add a sibling `IconButton.svelte`) to support icon-only rendering with an accessible label (`aria-label`/`title`) instead of visible text, since the bar buttons currently only support a visible text `label`.

**Out of scope:**
- "Song & part" bar button's label/icon (not raised in feedback — stays text).
- Any change to the full lyric sheet view (`.full-lyrics-view`, for the Lyrics part) — the feedback is about the in-tab ticker strip only.
- Redesigning bar layout/spacing beyond what's needed to fit the new lyrics-toggle control.

## Technical Approach

- Add `lucide-svelte` as a client dependency (`client/package.json`). It ships tree-shakeable Svelte icon components, matching Principle V over hand-rolled inline SVGs.
- `Button.svelte` currently renders `{label}` as visible text unconditionally (`client/src/components/Button.svelte`). Add an `icon` slot/prop (a Lucide component) and an `iconOnly` boolean: when `iconOnly` is true, render only the icon with `label` moved to `aria-label`/`title` for accessibility — bar icon buttons stay screen-reader- and hover-tooltip-friendly despite showing no text.
- In `App.svelte`'s `controls()` snippet (~line 154–169): replace the Settings/Start/Pause-Resume/Stop/Leave-session `<Button>` calls with icon variants (`Settings2`/cog, `Play`/`Pause`/`Square` for tape-recorder controls, `LogOut` or `DoorOpen` for leave session — pick the closest Lucide name available at implementation time), and add a "Toggle lyrics" icon button (e.g. `Mic2` or `AudioLines` — implementation picks the clearest fit) gated the same way `Playback.svelte`'s current button is (`!isLyricsPart`), since the toggle is meaningless on the tab-less Lyrics part.
- Remove the standalone "Toggle lyrics" `<Button>` from `Playback.svelte` (~line 27–30) now that it lives in the bar; `App.svelte` already has access to the same `isLyricsPart`/`toggleOverlay` derivations needed to gate and wire the bar's version (or lifts them from `Playback.svelte` if not already present at that scope).
- Fix the lyrics-off visibility bug: `lyrics-overlay.ts`'s `setVisible()` already sets `overlay.style.display = visible ? '' : 'none'` on the top-level `.lyrics-overlay` div — the same element that carries the background band (`client/src/styles/motifs.css` `.lyrics-overlay` background rule). Investigate live (per this project's established pattern of verifying visual/CSS bugs in a real browser before declaring a fix) why the strip persists after toggle-off: the likely culprit is the second, duplicate `.lyrics-overlay` rule in `client/src/lyrics.css` (unscoped, loaded separately from `motifs.css`'s) whose cascade/specificity interaction with the inline `display: none` needs confirming, or a stacking-context/paint issue with `.lyrics-overlay-container`'s `position: relative` wrapper remaining visible. Fix at the actual root cause found live, not by guessing.
- Update the `ui.md` artifact (Lobby View / Playback View sections) to reflect: lyrics toggle lives in the persistent bar (not a standalone Playback-view button), and the bar's play/pause/stop/settings/leave-session controls are icon-based, tape-recorder-styled for playback, adding a brief note that icon buttons carry accessible labels via `aria-label`.

## Phase Breakdown

### Phase 1: Icon foundation
- T001 — Add `lucide-svelte` dependency; extend `Button.svelte` with icon-only rendering support (icon prop/slot + `aria-label` from `label`). `[artifacts: ui]` (addresses F006)

### Phase 2: Bar control icon swap
- T002 — Replace Settings, Start/Pause-Resume/Stop, and Leave-session bar buttons in `App.svelte` with icon-only buttons (cog, tape-recorder play/pause/stop, exit-door), each keeping its existing `label` as the accessible name. `[artifacts: ui]` (addresses F003, F004, F005) `[parallel with T003]`

### Phase 3: Lyrics toggle relocation and fix
- T003 — Move the "Toggle lyrics" control from `Playback.svelte` into the bar's `controls()` snippet in `App.svelte`, as an icon-only button gated on `!isLyricsPart`. `[artifacts: ui]` (addresses F002) `[parallel with T002]`
- T004 — Fix the lyrics-off bug so the in-tab strip's background band is fully hidden, not just the syllable text — root-caused and verified live in a real browser (this project's established verification pattern for CSS/visual bugs), not guessed at. `[artifacts: ui]` (addresses F001)

### Phase 4: Artifact sync
- T005 — Update `ui.md`'s Lobby View / Playback View sections to describe the relocated, icon-based bar controls and the lyrics-toggle's new home. `[artifacts: ui]`

## Open Questions

- Exact Lucide icon picks (e.g. `LogOut` vs `DoorOpen` for "leave session", `Mic2` vs `AudioLines` for lyrics toggle) — left to implementation-time judgment per available icon names and visual fit, consistent with this project's pattern of deferring cosmetic specifics to live implementation.
- Whether "Song & part" also becomes icon-only for visual consistency with the rest of the bar — feedback didn't raise it, so it's left as text for this plan; a follow-up feedback item can extend the icon treatment if desired.

## Production Annotation Summary

Not applicable — constitution.md declares no production-annotation principle.
