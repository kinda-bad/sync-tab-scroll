<script lang="ts">
  // Personal, this-device-only (ui.md Settings View tab, feature
  // horizontal-scroll-view). One self-contained row so the Settings modal
  // only has to place it. Flipping it rebuilds this participant's engine in
  // the other layout (App.svelte reacts to horizontalViewStore).
  import Button from './Button.svelte';
  import { horizontalViewStore, persistHorizontalView } from '../horizontal-view-preference';
</script>

<span class="section-label">Horizontal view</span>
<div class="control-row">
  <Button
    variant={$horizontalViewStore ? 'riot' : 'ghost'}
    label={$horizontalViewStore ? 'Horizontal view: On' : 'Horizontal view: Off'}
    onclick={() => persistHorizontalView(!$horizontalViewStore)}
  />
</div>
<p class="hint">One long line of tab scrolling past a fixed playhead, with the lyrics above it. Only your view changes.</p>

<style>
  /* Same as SettingsModal.svelte's own (scoped there, so repeated here). */
  .section-label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-dim);
    margin: var(--space-4) 0 var(--space-2);
  }
  .hint {
    color: var(--ink-dim);
    font-size: 0.875rem;
  }
  .control-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }
</style>
