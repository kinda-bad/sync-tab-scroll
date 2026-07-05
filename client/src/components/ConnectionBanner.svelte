<script lang="ts">
  import { clientStore } from '../store';
</script>

{#if $clientStore.connectionStatus !== 'connected'}
  <div class="connection-banner" data-testid="connection-banner">
    Connection lost — trying to reconnect…
  </div>
{/if}

<style>
  .connection-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    /* Must exceed alphaTab's own .at-cursors (z-index: 1000) and this app's
       .lyrics-overlay (z-index: 1001, motifs.css) — same reasoning as
       Toasts.svelte's z-index: 1010. */
    z-index: 1010;
    background: var(--riot-dim);
    color: var(--ink);
    border-bottom: 1px solid var(--riot);
    padding: var(--space-2) var(--space-4);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    text-align: center;
  }
</style>
