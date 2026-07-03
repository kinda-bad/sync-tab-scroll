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

<style>
  .playback-controls {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-4);
  }
</style>
