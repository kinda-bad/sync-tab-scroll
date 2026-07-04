<script lang="ts">
  import { toggleOverlay as engineToggleOverlay } from '../playback-engine';
  import { clientStore } from '../store';
  import Button from '../components/Button.svelte';

  // Derived from clientStore (constitution Principle I) rather than reading
  // playback-engine's module-singleton state reactively — a bare function
  // call (getEngine()) inside a $: block isn't actually reactive in Svelte,
  // since nothing tells it to re-run when the singleton changes. The
  // singleton itself still exists for imperative one-off calls below
  // (toggleOverlay), which don't need reactivity.
  $: participant = $clientStore.session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: isLyricsPart = participant?.selectedPart === 'lyrics';

  function toggleOverlay() {
    engineToggleOverlay();
  }
</script>

<section class="playback-controls">
  {#if !isLyricsPart}
    <Button variant="ghost" label="Toggle lyrics" onclick={toggleOverlay} />
  {/if}
</section>

{#if !$clientStore.engineReady}
  <!-- ui.md States: Loading — a prominent, in-view signal that the tab/lyrics
       haven't actually rendered yet, distinct from the small per-participant
       ReadinessBadge in the persistent Bar (easy to miss once already on this
       view). Clears itself once playback-engine.ts's `engineReady` flips true
       (tasks-session-lifecycle-836f T009) — never a silent stall. -->
  <div class="loading-banner" role="status">{isLyricsPart ? 'Loading lyrics…' : 'Loading tab…'}</div>
{/if}

<style>
  .playback-controls {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-4);
  }

  .loading-banner {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--font-mono);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.9375rem;
    color: var(--hazard);
    border: 1px solid var(--hazard);
    padding: var(--space-3) var(--space-4);
    background: var(--bg);
    pointer-events: none;
    z-index: 50;
  }
</style>
