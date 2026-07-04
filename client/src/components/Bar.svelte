<script lang="ts">
  import type { Snippet } from 'svelte';
  import HazardBar from './HazardBar.svelte';

  // The one persistent bar (brand.md) — bottom-pinned, present in Lobby and
  // Playback both, never a separate top header + bottom transport split.
  // `progress` drives the hazard strip above the torn edge: aggregate
  // readiness in the Lobby, playback position in Playback.
  export let progress: number = 0; // 0–1
  export let identity: Snippet;
  export let controls: Snippet;
  export let status: Snippet;
</script>

<div class="hazard-wrap">
  <HazardBar fill={progress} />
</div>
<div class="bar-wrap">
  <div class="bar torn-edge signature-glitch signature-tape">
    <div class="bar-section bar-identity">
      {@render identity()}
    </div>
    <div class="bar-section bar-controls">
      {@render controls()}
    </div>
    <div class="bar-section bar-status">
      {@render status()}
    </div>
  </div>
</div>

<style>
  .hazard-wrap {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    z-index: 100;
  }

  .bar-wrap {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
  }

  .bar {
    display: flex;
    /* Phone widths: sections wrap upward (the wrap is anchored to the
       bottom-pinned .bar-wrap) instead of the trailing status chips being
       clipped off the right edge invisibly. */
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-4);
    min-height: var(--bar-height);
    padding: var(--space-2) var(--space-4) var(--space-3);
    background: var(--bar-surface);
    /* torn-edge's clip-path eats into the top ~12% — extra top padding
       keeps content clear of the jagged silhouette. */
    padding-top: calc(var(--space-3) + 0.5rem);
  }

  .bar-section {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .bar-identity {
    /* The 12rem basis keeps the join code / song identity readable: when
       the controls don't fit beside it (phone widths), they wrap to their
       own row instead of the identity ellipsizing down to nothing. */
    flex: 1 1 12rem;
    overflow: hidden;
  }

  .bar-controls {
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .bar-status {
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
</style>
