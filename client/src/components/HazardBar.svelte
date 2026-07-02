<script lang="ts">
  /**
   * The signature fill device (brand.md) — diagonal hazard-tape stripes
   * instead of a smooth gradient. One component, reused for per-participant
   * readiness, playback progress, and (via CSS class on the syllable
   * itself) lyric-timing highlight.
   */
  export let fill: number = 0; // 0–1
  export let label: string | undefined = undefined;
</script>

<div class="hazard-bar hazard-stripes" style="--hazard-fill: {Math.max(0, Math.min(1, fill))}" role="progressbar" aria-valuenow={Math.round(fill * 100)} aria-valuemin={0} aria-valuemax={100}>
  {#if label}
    <span class="hazard-bar-label">{label}</span>
  {/if}
</div>

<style>
  .hazard-bar {
    position: relative;
    height: 0.5rem;
    border: 1px solid var(--border);
  }

  .hazard-bar-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink);
    mix-blend-mode: difference;
  }
</style>
