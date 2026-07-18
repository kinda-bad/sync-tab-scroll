<script lang="ts">
  // T001 (tasks-hover-long-press-tooltip-for-i-9124.md): standalone popover
  // shown by a hosting control (e.g. Button.svelte's iconOnly mode) on
  // hover/long-press, per ui.md's "Bar controls are icon-based" paragraph.
  export let label: string;
  export let visible = false;
</script>

{#if visible}
  <span class="tooltip" role="tooltip">{label}</span>
{/if}

<style>
  .tooltip {
    position: absolute;
    bottom: calc(100% + var(--space-2));
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--ink);
    pointer-events: none;
    z-index: 20;
  }
</style>
