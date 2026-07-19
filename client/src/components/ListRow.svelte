<script lang="ts">
  import type { Snippet } from 'svelte';
  // T003 (tasks-icons-a11y-ticker-a10d.md, feedback F002): the host
  // designation renders as a crown icon instead of "HOST" text. The icon is
  // decorative (aria-hidden); an adjacent visually-hidden "Host" keeps the
  // designation announced to screen readers.
  import Crown from 'lucide-svelte/icons/crown';

  // Generic row used for both the participant list and the catalog picker —
  // a label, optional dim secondary text, and trailing content (a badge or
  // action button).
  export let label: string;
  export let sublabel: string | undefined = undefined;
  // Marks this row's participant as the session host (crown badge).
  export let host = false;
  export let active = false;
  export let children: Snippet;
</script>

<li class="row" class:active>
  <div class="row-text">
    <span class="row-label">{label}</span>
    {#if host || sublabel}
      <span class="row-sublabel">
        {#if host}
          <Crown size={12} aria-hidden="true" />
          <span class="sr-only">Host</span>
        {/if}
        {#if host && sublabel}<span aria-hidden="true">·</span>{/if}
        {#if sublabel}{sublabel}{/if}
      </span>
    {/if}
  </div>
  <div class="row-trailing">
    {@render children()}
  </div>
</li>

<style>
  .row {
    display: flex;
    /* On narrow screens a wide trailing control (e.g. "Request to become
       host") wraps below the label instead of forcing horizontal scroll. */
    flex-wrap: wrap;
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
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--ink-dim);
  }

  /* Visually hidden but screen-reader announced (crown's "Host" text). */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .row-trailing {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
    min-width: 0;
    max-width: 100%;
  }
</style>
