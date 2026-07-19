<script lang="ts">
  import { clientStore } from '../store';
  import { partDisplayNames } from '../part-display-name';

  // Derived from clientStore (constitution Principle I).
  $: participant = $clientStore.session?.participants.find((p) => p.id === $clientStore.selfParticipantId);
  $: isLyricsPart = participant?.selectedPart === 'lyrics';
  // No indication anywhere in the Playback view of which part is actually
  // being followed — a participant switching parts (Song & part modal) had
  // no way to confirm which instrument/lyrics they'd landed on without
  // reopening that modal.
  // Instrument-prominent + de-emphasized detail (ui.md part-name display
  // rule): derived over the whole part list, since uniqueness/numbering is
  // a per-song property of partDisplayNames.
  $: partNames = partDisplayNames(($clientStore.session?.availableParts ?? []).map((p) => p.instrumentName));
  $: selectedIdx = $clientStore.session?.availableParts.findIndex((p) => p.trackIndex === participant?.selectedPart) ?? -1;
  $: currentPart = isLyricsPart
    ? { instrument: 'Lyrics', detail: null }
    : selectedIdx >= 0
      ? partNames[selectedIdx]
      : undefined;
</script>

<!-- "Toggle lyrics" moved into the persistent bar's controls() snippet
     (App.svelte) — tasks-bottom-bar-icons-47a6.md T003, feedback F002. -->
<section class="playback-controls">
  {#if currentPart}
    <span class="current-part" data-testid="current-part"
      >Playing: {currentPart.instrument}{#if currentPart.detail}<span class="part-detail"> · {currentPart.detail}</span>{/if}</span
    >
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
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
  }

  .current-part {
    color: var(--ink-dim);
    font-size: 0.875rem;
  }

  /* De-emphasized detail (performer/qualifier) — kept, not dropped (ui.md). */
  .part-detail {
    font-size: 0.75rem;
    opacity: 0.7;
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
