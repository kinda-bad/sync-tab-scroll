<script lang="ts">
  import type { Snippet } from 'svelte';

  // Generic row used for both the participant list and the catalog picker —
  // a label, optional dim secondary text, and trailing content (a badge or
  // action button).
  export let label: string;
  export let sublabel: string | undefined = undefined;
  export let active = false;
  export let children: Snippet;
</script>

<li class="row" class:active>
  <div class="row-text">
    <span class="row-label">{label}</span>
    {#if sublabel}
      <span class="row-sublabel">{sublabel}</span>
    {/if}
  </div>
  <div class="row-trailing">
    {@render children()}
  </div>
</li>

<style>
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
    list-style: none;
  }

  .row.active {
    background: var(--riot-dim);
  }

  .row-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .row-label {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-sublabel {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--ink-dim);
  }

  .row-trailing {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }
</style>
