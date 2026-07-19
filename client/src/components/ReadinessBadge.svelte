<script lang="ts">
  import type { ReadinessStatus } from '@sync-tab-scroll/shared';
  import Clock from 'lucide-svelte/icons/clock';
  import Check from 'lucide-svelte/icons/check';

  export let readiness: ReadinessStatus;
  export let connected: boolean = true;

  const labels: Record<ReadinessStatus, string> = {
    'no-part': 'NO PART',
    loading: 'LOADING',
    loaded: 'LOADED',
    ready: 'READY',
  };
</script>

<!-- `loaded` vs `ready` carry the clock-vs-check icon distinction
     (explicit-participant-readiness, ui.md Explicit Readiness): clock =
     assets done but not yet human-confirmed, check = confirmed ready. -->
<span class="badge" class:ready={readiness === 'ready'} class:loading={readiness === 'loading'} class:offline={!connected}>
  {#if connected && readiness === 'loaded'}
    <Clock size={12} aria-hidden="true" />
  {:else if connected && readiness === 'ready'}
    <Check size={12} aria-hidden="true" />
  {/if}
  {connected ? labels[readiness] : 'OFFLINE'}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    color: var(--ink-dim);
  }

  .badge.loading {
    border-color: var(--hazard);
    color: var(--hazard);
  }

  .badge.ready {
    border-color: var(--riot);
    color: var(--riot);
  }

  .badge.offline {
    border-color: var(--border);
    color: var(--ink-dim);
    opacity: 0.5;
  }
</style>
