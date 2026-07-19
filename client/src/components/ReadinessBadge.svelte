<script lang="ts">
  import type { ReadinessStatus } from '@sync-tab-scroll/shared';

  export let readiness: ReadinessStatus;
  export let connected: boolean = true;

  const labels: Record<ReadinessStatus, string> = {
    'no-part': 'NO PART',
    loading: 'LOADING',
    loaded: 'LOADED',
    ready: 'READY',
  };
</script>

<span class="badge" class:ready={readiness === 'ready'} class:loading={readiness === 'loading'} class:offline={!connected}>
  {connected ? labels[readiness] : 'OFFLINE'}
</span>

<style>
  .badge {
    display: inline-block;
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
