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
  // No indication anywhere in the Playback view of which part is actually
  // being followed — a participant switching parts (Song & part modal) had
  // no way to confirm which instrument/lyrics they'd landed on without
  // reopening that modal.
  $: currentPartLabel = isLyricsPart
    ? 'Lyrics'
    : $clientStore.session?.availableParts.find((p) => p.trackIndex === participant?.selectedPart)?.instrumentName;

  function toggleOverlay() {
    engineToggleOverlay();
  }
</script>

<section class="playback-controls">
  {#if !isLyricsPart}
    <Button variant="ghost" label="Toggle lyrics" onclick={toggleOverlay} />
  {/if}
  {#if currentPartLabel}
    <span class="current-part" data-testid="current-part">Playing: {currentPartLabel}</span>
  {/if}
</section>

<style>
  .playback-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
  }

  .current-part {
    color: var(--ink-dim);
    font-size: 0.875rem;
  }
</style>
