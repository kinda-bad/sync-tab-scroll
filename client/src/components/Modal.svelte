<script lang="ts">
  import type { Snippet } from 'svelte';

  export let open: boolean;
  export let title: string;
  export let dismissible: boolean = true;
  export let onClose: (() => void) | undefined = undefined;
  export let children: Snippet;

  function handleBackdropClick() {
    if (dismissible) onClose?.();
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (dismissible && e.key === 'Escape') onClose?.();
  }
</script>

{#if open}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
    role="button"
    tabindex="-1"
  >
    <div
      class="modal-panel"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <h2 class="modal-title">{title}</h2>
        {#if dismissible}
          <button class="modal-close" onclick={() => onClose?.()} aria-label="Close">×</button>
        {/if}
      </div>
      <div class="modal-body">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    /* Must exceed alphaTab's own internal .at-cursors z-index: 1000 (and
       this app's lyrics-overlay z-index: 1001, see motifs.css) — a modal
       has to stay on top of the persistent tab/lyrics engine regardless. */
    z-index: 1010;
    padding: var(--space-4);
  }
  .modal-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    width: 100%;
    max-width: 32rem;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--border);
  }
  .modal-title {
    font-family: var(--font-display);
    font-size: 1.25rem;
    letter-spacing: 0.02em;
    margin: 0;
  }
  .modal-close {
    background: none;
    border: none;
    color: var(--ink);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: var(--space-1);
  }
  .modal-body {
    padding: var(--space-4);
    overflow-y: auto;
  }
</style>
