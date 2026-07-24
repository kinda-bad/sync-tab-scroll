<script lang="ts">
  export let label: string;
  export let value: string = '';
  export let placeholder: string = '';
  export let uppercase = false;
  // Non-authoritative inline validation feedback (T004/T005) — a caller-
  // computed message (or null) shown under the field; purely UX, the actual
  // enforcement always stays server-side (infrastructure.md Input Validation).
  export let error: string | null = null;
  export let onblur: (() => void) | undefined = undefined;
</script>

<label class="field">
  <span class="field-label">{label}</span>
  <input
    type="text"
    bind:value
    {placeholder}
    class="field-input"
    class:uppercase
    class:has-error={!!error}
    {onblur}
  />
  {#if error}
    <span class="field-error">{error}</span>
  {/if}
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-label {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-dim);
  }

  .field-input {
    font-family: var(--font-mono);
    font-size: 0.9375rem;
    padding: var(--space-2) var(--space-3);
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--ink);
  }

  .field-input.uppercase {
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .field-input::placeholder {
    color: var(--ink-dim);
  }

  .field-input:focus {
    outline: none;
    border-color: var(--riot);
  }

  .field-input.has-error {
    border-color: var(--riot);
  }

  .field-error {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--riot);
  }
</style>
