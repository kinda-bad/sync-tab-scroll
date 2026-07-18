---
status: approved
branch: hover-long-press-tooltip-for-i
created: 2026-07-18
features: [hover-long-press-tooltip-for-i]
surfaced-defects: []
---

# Plan: Hover/long-press tooltip for icon-only bar buttons

## Goal

Add a visible, touch-aware tooltip to `Button.svelte`'s `iconOnly` mode — shown on mouse hover and on touch long-press — so sighted mouse/touch users can identify an icon-only bar button's function without relying solely on the native `title` attribute, which is inconsistently discoverable and does nothing on touch screens.

## Scope

**In scope:**
- A new `Tooltip.svelte` component: shows a small styled label near the trigger element, positioned to stay on-screen.
- Wiring `Button.svelte`'s `iconOnly` mode to show the tooltip on `pointerenter`/`pointerleave` (desktop hover) and on a long-press gesture (touch — press-and-hold past a threshold, e.g. ~500ms, without releasing or moving past a small tolerance) that dismisses on release or on tapping elsewhere.
- Keeping the existing `aria-label`/`title` attributes as-is (the tooltip supplements, not replaces, the accessible name and the native fallback).

**Out of scope:**
- Any change to non-`iconOnly` (text) buttons — they already show their label directly, no tooltip needed.
- Any change to which controls are icon-only, or their icons — that's already-shipped scope from `tasks-bottom-bar-icons-47a6.md`.

## Technical Approach

- New `client/src/components/Tooltip.svelte`: a small popover-style component taking a `label: string` and `visible: boolean` prop, rendered as an absolutely-positioned element anchored to its parent (`Button.svelte`'s `<button>` establishes `position: relative` for it), styled per `brand.md`'s existing token set (matching other small chrome like `ReadinessBadge`). No new dependency — plain Svelte conditional rendering + CSS, consistent with Principle V (check existing idioms — this app has no tooltip library anywhere, and the need is simple enough not to warrant adding one).
- `Button.svelte`: when `iconOnly` is true, wire `onpointerenter`/`onpointerleave` to show/hide the tooltip for mouse/pen input, and a long-press handler for touch — `onpointerdown` starts a timer (~500ms) that shows the tooltip if the pointer hasn't moved past a small tolerance or been released; `onpointerup`/`onpointerleave`/`onpointercancel` clears the timer and hides the tooltip. Using pointer events (not separate mouse/touch listeners) covers mouse, pen, and touch through one event model, matching how the rest of the client already avoids browser-specific event branching.
- Local component state (`showTooltip`) lives in `Button.svelte` itself — no client-store involvement (constitution Principle I governs cross-component shared state; this is purely local, transient UI state for one button instance, same category as existing local component state elsewhere in the codebase).

## Phase Breakdown

### Phase 1: Tooltip component
- T001 — Create `client/src/components/Tooltip.svelte` (label + visible props, positioned popover, brand.md-consistent styling). `[artifacts: ui]` (feature: hover-long-press-tooltip-for-i)

### Phase 2: Wire into Button.svelte
- T002 — Wire `Button.svelte`'s `iconOnly` mode to `Tooltip.svelte` via pointer-event hover (desktop) and long-press (touch) handlers, dismissing on pointer-leave/release/tap-elsewhere. `[artifacts: ui]` (feature: hover-long-press-tooltip-for-i)

## Open Questions

- Exact tooltip visual treatment (position — above vs. below the button, arrow/pointer nub or plain box) and the long-press threshold's exact millisecond value — left to implementation-time visual/feel judgment, consistent with this project's existing pattern of deferring cosmetic specifics (e.g. the gap-timing indicator's sizing) to live implementation.

## Production Annotation Summary

Not applicable — constitution.md declares no production-annotation principle.
