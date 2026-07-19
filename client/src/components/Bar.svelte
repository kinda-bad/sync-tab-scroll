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
  <div class="bar torn-edge signature-glitch signature-tape glitch-cut-edge">
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
  /* z-index 1100 (was 100), feedback F005 / tasks-icons-a11y-ticker-a10d
     T001: alphaTab injects `.at-cursors` with an inline z-index: 1000 and
     the lyrics ticker sits at 1001 (motifs.css) — both painted over the
     bar's children, including Button.svelte's tooltips, which are trapped
     in this fixed element's stacking context and can't out-stack it from
     inside. Required order: tab cursors (1000) < ticker (1001) < bar/
     tooltip (1100). The ticker never overlaps the bar itself (it's
     anchored above --bar-height), so raising the bar over it is safe. */
  .hazard-wrap {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    z-index: 1100;
  }

  .bar-wrap {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1100;
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
    /* torn-edge's (riot) and glitch-cut-edge's (cyberpunk) clip-paths both
       eat into the top ~12–24% depending on theme — extra top padding
       keeps content clear of whichever jagged silhouette is active. */
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
