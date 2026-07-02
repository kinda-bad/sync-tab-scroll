<script lang="ts">
  import { toastStore } from '../toast-store';
</script>

<div class="toasts">
  {#each $toastStore as toast (toast.id)}
    <div class="toast">{toast.message}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    /* Clears the persistent Bar (brand.md) — toasts stack above it, not
       underneath or overlapping. */
    bottom: calc(var(--bar-height) + var(--space-6));
    right: var(--space-4);
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
    z-index: 200;
    max-width: 20rem;
  }

  .toast {
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--border);
    border-left: 3px solid var(--riot);
    padding: var(--space-3) var(--space-4);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
  }
</style>
