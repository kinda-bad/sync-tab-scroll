---
plan: plan-settings-modal-redesign-2026-07-03.md
generated: 2026-07-03
status: ready
---

# Tasks

## Phase 1: Tabbed settings modal + Participants tab

- [ ] T001 [artifacts: ui] Write a test first (Principle VII): update `client/e2e/multi-participant.spec.ts` and `client/e2e/host-controls.spec.ts` — both currently assume the participant list, lobby cursor input/Set/Clear buttons, Spotlight-mode toggle, and remove-participant-driven list update are all inline in the Lobby body (e.g. `page.getByRole('spinbutton')`, `page.getByRole('button', { name: 'Set lobby cursor' })`, `page.getByRole('button', { name: /Spotlight mode:/ })`, `page.getByText('Member', { exact: true })`). Add a step opening the new settings modal via a cog control (e.g. `page.getByRole('button', { name: 'Settings' }).click()` — adjust to whatever accessible name T002 actually gives the control) before each such interaction/assertion. Confirm these now fail against the current inline-Lobby-rendering code (the cog control doesn't exist yet).

- [ ] T002 [artifacts: ui] Build `client/src/components/SettingsModal.svelte`, wrapping the existing generic `client/src/components/Modal.svelte` shell (same reuse pattern as `client/src/components/SongPartModal.svelte`, title e.g. "Settings"). Add a 2-tab strip (`Participants` / `Settings`, plain local component state e.g. `let activeTab: 'participants' | 'settings' = 'participants'`, two `Button` components or similar toggling it). Populate the **Participants** tab by lifting `client/src/views/Lobby.svelte`'s current content verbatim: participant `ListRow`s with `ReadinessBadge` (host-only remove-participant control if any exists — check `Lobby.svelte` first, it currently has none wired to UI, only the server handler), the lobby-cursor number input + "Set lobby cursor"/"Clear" buttons (host-only), and the "Spotlight mode: on/off" toggle button (host-only). Leave the **Settings** tab empty for now (T005 fills it in). Read `Lobby.svelte` first to copy its exact markup/conditionals rather than re-deriving them.

- [ ] T003 [artifacts: ui] Add a settings-cog control to `App.svelte`'s `Bar` `controls()` snippet, alongside the existing "Song & part" button (both only relevant/visible in the Lobby view, matching the existing `{#if $clientStore.view === 'lobby'}` gating on "Song & part"). Add a new `settingsModalOpen` local boolean state in `App.svelte` (same pattern as existing `songPartModalOpen`), a `toggleSettingsModal()` function, and render `<SettingsModal open={settingsModalOpen} onClose={() => settingsModalOpen = false} />` alongside the existing `<SongPartModal ... />`. Run T001's tests and confirm they now pass.

- [ ] T004 [artifacts: ui] Remove the now-migrated participant-list/lobby-cursor/Spotlight-toggle content from `client/src/views/Lobby.svelte`, replacing it with a single state-dependent hint, checked in this order (read `App.svelte`'s existing reactive derivations — `hasPart`, `isHost`, `readyCount`, `totalCount` — for the exact equivalent logic to mirror into `Lobby.svelte`, which currently derives its own `session`/`wsClient`/`isHost` locally):
  1. Not host, and `!session.selectedSong`: `"Waiting for the host to pick a song."`
  2. Host, and `!session.selectedSong`: `"Pick a song to get started."` plus a short pointer to the "Song & part" nav-bar control (e.g. "Use Song & part in the bar below.").
  3. `session.selectedSong` is set but this participant's `selectedPart` is `null`: `"Select your part."` plus the same pointer to "Song & part".
  4. Both set (ready-to-start state): `` `${readyCount} of ${totalCount} ready — waiting for host to start.` ``

  Note in a code comment that cases 1-3 normally render behind the song/part modal's existing forced-open, non-dismissible backdrop (unchanged scope) — reachable in principle, not literally dead code, just usually covered immediately in today's normal flow.

- [ ] T005 [artifacts: ui] Revise `.project/artifacts/ui.md`'s Lobby View section: describe the new settings-cog-opened, tabbed modal (Participants tab holding what used to be inline: participant list, lobby cursor, Spotlight toggle; Settings tab holding the theme control from Phase 2) in place of the current "Outside the modal, the Lobby body shows live participant list..." description; describe the 4-case Lobby-body hint from T004; note song/part selection is unchanged (still its own separate, non-tabbed, forced-open modal). Bump `last_updated`, set `diagram_status: stale` (unless already `unrendered`).

## Phase 2: Theme control (Settings tab)

- [ ] T006 [artifacts: infrastructure] Write a test first (Principle VII): add `client/src/theme.ct.spec.ts` (or a vitest unit test if no DOM/localStorage dependency requires CT — check whether `localStorage`/`document.documentElement` are available under vitest's environment in this project first, matching whichever existing test file's setup is closest) asserting: `applyTheme('light')` sets `document.documentElement.dataset.theme` to `'light'`; `persistTheme('light')` followed by `loadStoredTheme()` returns `'light'`; `loadStoredTheme()` returns `undefined` with nothing stored. Confirm it fails — `client/src/theme.ts` doesn't exist yet.

- [ ] T007 [artifacts: infrastructure] Add `client/src/theme.ts`, mirroring `client/src/session-persistence.ts`'s shape: a `StoredTheme = 'dark' | 'light'` type (reuse `tab-renderer.ts`'s existing `Theme` type rather than redeclaring it, if convenient), `loadStoredTheme(): StoredTheme | undefined` (reads a new `localStorage` key, e.g. `'sync-tab-scroll:theme'`), `persistTheme(theme: StoredTheme): void` (writes it), and `applyTheme(theme: StoredTheme): void` (sets `document.documentElement.dataset.theme = theme`). Run T006's test and confirm it passes.

- [ ] T008 [artifacts: infrastructure] In `client/src/playback-engine.ts`, refactor the existing (currently unused/dead — nothing calls it) `toggleTheme()` export into an explicit `setEngineTheme(theme: Theme): void` that sets `state.theme = theme` and calls `tab-renderer.ts`'s `setTheme(state.api, theme)` when `!state.isLyricsPart` (same guard logic `toggleTheme()` already had, just taking the target value directly instead of flipping the current one). Update `theme.ts`'s `applyTheme()` to also call `setEngineTheme(theme)` (import from `playback-engine.ts`) so the document-level palette and the tab-notation colors change together, per brand.md's "toggling theme anywhere in the app switches both at once." Grep the codebase first to confirm nothing else calls the old `toggleTheme()` name before renaming it (expected: nothing does, per the plan's own finding) — if something unexpectedly does, stop and report rather than silently breaking a caller.

- [ ] T009 In `client/src/main.ts`, call `applyTheme(loadStoredTheme() ?? 'dark')` once on startup (before or alongside `startSessionPersistence()` — order doesn't matter, they're independent), matching `tokens.css`'s existing default (`:root, :root[data-theme='dark']` share styles, i.e. dark is the implicit default today).

- [ ] T010 [artifacts: ui] Add a dark/light toggle control to `SettingsModal.svelte`'s Settings tab (a single button or switch is fine — this app has no other theme control to match stylistically yet, use existing `Button` component conventions), calling `applyTheme()` + `persistTheme()` with the toggled value on click, and reflecting the current theme (read `document.documentElement.dataset.theme`, or track it in a small local reactive value updated alongside the calls) in its own label/state.

- [ ] T011 Manual verification in a real browser: with dev servers running, select an instrument part, open the settings modal's Settings tab, toggle the theme, and confirm both the app's CSS palette (backgrounds, text, bar) and the rendered tab notation's colors change together. Refresh the page and confirm the choice persisted (starts in the same theme, not reset to dark).

## Phase 3: Start closes modals

- [ ] T012 Write a test first (Principle VII): extend `client/e2e/single-participant.spec.ts` or `client/e2e/host-controls.spec.ts` — open the settings modal (via the cog) while in the Lobby with a song/part already selected and readiness set, click "Start", and assert the settings modal is no longer visible (e.g. its panel/backdrop has count 0). Confirm it fails against current code (`startPlayback()` doesn't close anything yet).

- [ ] T013 In `App.svelte`'s `startPlayback()`, set `songPartModalOpen = false` and `settingsModalOpen = false` before (or alongside) sending the `{ type: 'playback-control', action: 'start' }` message. Do not touch anything in `playback-engine.ts` related to the lyrics overlay (`showOverlay`/`toggleOverlay()`) — satisfy the "but not the lyrics overlay" requirement by simply never referencing it here, not via an exclusion branch. Run T012's test and confirm it passes.

## Phase 4: Hazard strip repositioning

- [ ] T014 Write a test first (Principle VII): add a CT test (extend an existing CT spec that already mounts `Bar.svelte`, or add a new `client/src/components/Bar.ct.spec.ts` if none exists — check first) asserting that after mounting `Bar`, the hazard-strip element's computed `top` is `'0px'` and the nav-bar element's computed `bottom` is `'0px'` simultaneously (i.e. two independently `position: fixed` elements, not one nested inside the other's fixed wrapper). Confirm it fails against the current single-`.bar-wrap` structure (today only `bottom: 0` exists; there is no independently-`top`-pinned element).

- [ ] T015 [artifacts: ui] In `client/src/components/Bar.svelte`, split the current single `.bar-wrap` (which contains both `<HazardBar>` and the nav-bar `.bar` div, `position: fixed; bottom: 0`) into two independently-positioned wrapper elements: a new top-pinned wrapper (`position: fixed; top: 0; left: 0; right: 0`) containing `<HazardBar fill={progress} />` alone, and the existing bottom-pinned wrapper (unchanged `bottom: 0`) containing only the `.bar` div — both still driven by the same `progress` prop, so `Bar.svelte`'s public API (the `progress`/`identity`/`controls`/`status` props) doesn't change at all. Run T014's test and confirm it passes.

- [ ] T016 [artifacts: ui] In `client/src/App.svelte`'s `<style>` block, split `.app-content.with-bar`'s current combined `padding-bottom: calc(var(--bar-height) + var(--space-8))` (which today accounts for "the Bar's own height + the hazard strip above it" in one value, per its own comment) into a `padding-top` (for the now-top-pinned hazard strip — pick a value covering `HazardBar`'s actual rendered height, check its own component styles first) and an unchanged-in-spirit `padding-bottom` for the bar alone (no longer needing to also account for the hazard strip's height, since it moved out from above the bar). Update the rule's own comment to match the new split.

- [ ] T017 Manual verification in a real browser: confirm the hazard-tape strip now renders at the very top of the viewport (not between the nav bar and the main content), and that the Lobby/Playback body content has enough top padding that it's not obscured by it, while the bottom-pinned nav bar and its own bottom padding are unaffected.

## Phase 5: Full suite verification

- [ ] T018 Run `pnpm --filter client test`, `pnpm --filter client test:ct`, and `pnpm --filter client test:e2e`. Confirm every test from Phases 1-4 passes alongside the existing suite, with no regressions. Report final test/file counts.
