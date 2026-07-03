<script lang="ts">
  export let variant: 'ghost' | 'riot' | 'hazard' = 'ghost';
  export let label: string;
  export let disabled = false;
  export let type: 'button' | 'submit' = 'button';
  export let onclick: (() => void) | undefined = undefined;
</script>

<button class="btn btn-{variant}" {type} {disabled} {onclick}>
  {label}
</button>

<style>
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
