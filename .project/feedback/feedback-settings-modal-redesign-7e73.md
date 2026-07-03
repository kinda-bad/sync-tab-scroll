---
status: planned
created: 2026-07-03
plan: plan-settings-modal-redesign-2026-07-03.md
---

# Feedback

## UX
- [x] "Start" should close all currently-open modals (song/part-selection modal, and the cog-opened settings modal described below) when clicked — but must not affect the in-tab lyrics overlay, which is a separate on-tab display toggle, not a modal, and should keep playing/showing regardless of modal state. [artifacts: ui]
- [x] Add a settings-cog control to the persistent nav bar (`Bar.svelte`) opening a settings modal with tabs for **Participants** (participant list, lobby cursor, Spotlight-mode toggle — the content currently inline in the Lobby view body) and **Settings** (theme: dark vs. light — no such control exists today; theme is only switchable via `data-theme` in test harnesses like `__setTheme`/`tab-renderer.ct.spec.ts`, not from any real in-app UI). Song/part selection stays a separate, non-tabbed modal (its own existing nav-bar control) rather than a third tab — it has special forced-open/non-dismissible-until-set gating behavior tied to session readiness that doesn't fit naturally as one tab among others in a modal a user can freely dismiss. [artifacts: ui]

## Reconsidered
- [x] `ui.md`'s Lobby View section currently documents the participant list, lobby cursor, and Spotlight-mode toggle as rendered inline in the Lobby view's body ("Outside the modal, the Lobby body shows live participant list with readiness state...") — only song/part selection is modal-based today. Reconsidered, refined per the UX item above: this content (not the whole "Lobby view" as a single lump) moves into the cog-opened settings modal's **Participants** tab; song/part selection remains its own separate modal, unchanged. [artifacts: ui]
- [x] `Bar.svelte` currently renders `HazardBar` (the hazard-tape "warning" strip) directly above the persistent bottom-pinned nav bar, inside the same fixed `.bar-wrap` container — i.e. sandwiched between the nav bar and the main viewport content. Reconsidered: this strip should instead sit at the top of the view (screen-edge-pinned at the top), not wedged between the nav bar and the main viewport. [artifacts: ui]
