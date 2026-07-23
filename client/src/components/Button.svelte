<script lang="ts">
  import type { ComponentType } from 'svelte';
  import Tooltip from './Tooltip.svelte';

  export let variant: 'ghost' | 'riot' | 'hazard' = 'ghost';
  export let label: string;
  export let disabled = false;
  export let type: 'button' | 'submit' = 'button';
  export let onclick: (() => void) | undefined = undefined;
  // Icon-only bar controls (tasks-bottom-bar-icons-47a6.md T001): `icon` is
  // a Svelte component (e.g. a lucide-svelte icon) rendered in place of the
  // visible `{label}` text when `iconOnly` is true. The label is never
  // lost — it moves to `aria-label`/`title` so the control stays
  // screen-reader- and hover-tooltip-accessible despite showing no text.
  export let icon: ComponentType | undefined = undefined;
  export let iconOnly = false;
  // Optional queryable identifier (defect b16e2ab1): most controls are
  // located by accessible name in tests; this exists for the rare control
  // an artifact documents by a literal id (e.g. ui.md's
  // `mute-all-parts-button`) so that identifier is genuinely queryable on
  // the DOM element, not just a feature-tag string in comments.
  export let testId: string | undefined = undefined;

  // tasks-hover-long-press-tooltip-for-i-9124.md T002: the native `title`
  // attribute above is an unreliable *visible* hover cue (inconsistent
  // timing across browsers, nothing on touch), so a Tooltip supplements it
  // for iconOnly controls — shown on mouse/pen hover, and on ~500ms touch
  // long-press, dismissing on pointer-leave/release.
  let showTooltip = false;
  let buttonEl: HTMLButtonElement | undefined;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  const LONG_PRESS_MS = 500;

  function handlePointerEnter(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    showTooltip = true;
  }

  function handlePointerLeave(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      clearTimeout(longPressTimer);
    }
    showTooltip = false;
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    longPressTimer = setTimeout(() => {
      showTooltip = true;
    }, LONG_PRESS_MS);
  }

  function handlePointerUp(event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    clearTimeout(longPressTimer);
    showTooltip = false;
  }

  function handlePointerCancel(event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    clearTimeout(longPressTimer);
    showTooltip = false;
  }
</script>

<span class="btn-wrap">
  <button
    bind:this={buttonEl}
    class="btn btn-{variant}"
    {type}
    {disabled}
    {onclick}
    data-testid={testId}
    aria-label={iconOnly ? label : undefined}
    title={iconOnly ? label : undefined}
    onpointerenter={iconOnly ? handlePointerEnter : undefined}
    onpointerleave={iconOnly ? handlePointerLeave : undefined}
    onpointerdown={iconOnly ? handlePointerDown : undefined}
    onpointerup={iconOnly ? handlePointerUp : undefined}
    onpointercancel={iconOnly ? handlePointerCancel : undefined}
  >
    {#if iconOnly && icon}
      <svelte:component this={icon} size={18} aria-hidden="true" />
    {:else}
      {label}
    {/if}
  </button>
  {#if iconOnly}
    <Tooltip {label} visible={showTooltip} anchor={buttonEl} />
  {/if}
</span>

<style>
  .btn-wrap {
    position: relative;
    display: inline-block;
  }

  .btn {
    font-family: var(--font-mono);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.8125rem;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    transition:
      background-color 0.12s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      filter 0.12s ease;
  }

  .btn:hover:not(:disabled) {
    border-color: var(--ink);
  }

  .btn :global(svg) {
    display: block;
  }

  .btn:focus-visible {
    outline: 2px solid var(--riot);
    outline-offset: 2px;
  }

  .btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn-riot {
    background: var(--riot);
    border-color: var(--riot);
    color: var(--bg);
  }

  .btn-riot:hover:not(:disabled) {
    filter: brightness(1.12);
  }

  .btn-hazard {
    background: var(--hazard);
    border-color: var(--hazard);
    color: var(--bg);
  }

  .btn-hazard:hover:not(:disabled) {
    filter: brightness(1.12);
  }
</style>
