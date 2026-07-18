---
plan: plan-hover-long-press-tooltip-for-i-2026-07-18-c2e5.md
generated: 2026-07-18
status: in-progress
---

# Tasks

## Phase 1: Tooltip component

- [x] T001 [artifacts: ui] Create `client/src/components/Tooltip.svelte` with `export let label: string` and `export let visible = false` props: renders a small absolutely-positioned popover showing `label` text when `visible` is true (nothing in the DOM, or `display: none`, when false), styled per `brand.md`'s existing token set (`--font-mono`, `--ink`/`--bg` or similar surface tokens, small font-size, a subtle border/background consistent with this app's other small chrome like `ReadinessBadge`). Write a Playwright CT spec (`client/src/components/Tooltip.ct.spec.ts`) mounting it standalone, asserting: with `visible=false` the label text is not visible/present; with `visible=true` the label text is visible. Write and confirm it fails before implementing (constitution Principle VII).

## Phase 2: Wire into Button.svelte

- [x] T002 [artifacts: ui] In `client/src/components/Button.svelte`, when `iconOnly` is true, wrap the `<button>` (or its containing element) so `Tooltip.svelte` (from T001) can be positioned relative to it, and add local component state (`let showTooltip = false`) driving `Tooltip`'s `visible` prop. Wire mouse/pen hover via `onpointerenter`/`onpointerleave` on the button (set `showTooltip = true`/`false`), keyed off `event.pointerType !== 'touch'` so hover-driven showing doesn't also fire from a touch tap. Wire touch long-press via `onpointerdown` (only when `event.pointerType === 'touch'`): start a ~500ms timer that sets `showTooltip = true` if not cleared first; `onpointerup`/`onpointerleave`/`onpointercancel` clears the timer and sets `showTooltip = false`. Leave the existing `aria-label`/`title` attributes unchanged — the tooltip supplements them, not replaces them. Write a Playwright CT spec (extend `Button.ct.spec.ts` or add to it) asserting: for an `iconOnly` button, simulating a mouse hover (`pointerenter` with `pointerType: 'mouse'`) shows the tooltip and `pointerleave` hides it; simulating a touch long-press (`pointerdown` with `pointerType: 'touch'`, waiting past the threshold) shows the tooltip, and `pointerup` hides it; a touch tap shorter than the threshold (`pointerdown` immediately followed by `pointerup`) does *not* show the tooltip. Write and confirm it fails before implementing.
