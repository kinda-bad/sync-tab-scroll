<script lang="ts">
  import { onMount } from 'svelte';
  import { Volume2, VolumeOff } from 'lucide-svelte';
  import Button from './Button.svelte';
  import { formatPartDisplayName, type PartDisplayName } from '../part-display-name';

  // One Tracks-tab row (ui.md Tracks tab, tasks-settings-ux-bundle-02e8
  // T005): exactly one line — a display-only label (instrument prominent,
  // detail de-emphasized), an icon-only mute button (lucide volume-2
  // audible / volume-off muted, Button iconOnly + tooltip idiom), and the
  // text "Solo" button.
  export let display: PartDisplayName;
  export let muted: boolean;
  export let onToggleMute: () => void;
  export let onSolo: () => void;
  // T018: disabled in recording mode — per-part mute/solo have no effect on a
  // single mixed backing track. The buttons keep their accessible labels so a
  // screen reader still announces the (disabled) control (Bar accessibility rule).
  export let disabled = false;

  $: fullName = formatPartDisplayName(display);

  // Marquee on overflow only (bounce style — scroll to end, pause,
  // return): measured content vs container via getBoundingClientRect,
  // the same plain-DOM measurement idiom the lyrics ticker's centering
  // uses — never animated when the label fits. Re-measured on resize.
  let labelEl: HTMLElement;
  let marqueeEl: HTMLElement;
  let overflowing = false;
  let distance = 0;

  function measure(): void {
    if (!labelEl || !marqueeEl) return;
    const container = labelEl.getBoundingClientRect().width;
    const content = marqueeEl.getBoundingClientRect().width;
    overflowing = content > container + 1;
    distance = overflowing ? container - content : 0;
  }

  onMount(() => {
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(labelEl);
    return () => observer.disconnect();
  });

  // Re-measure when the label content changes (e.g. numbering shifts after
  // a song switch re-derives the part list).
  $: if (labelEl && display) measure();
</script>

<div class="track-row">
  <div class="track-label" data-testid="track-label" bind:this={labelEl}>
    <span
      class="track-marquee"
      data-testid="track-marquee"
      data-overflowing={overflowing ? 'true' : 'false'}
      style={`--marquee-distance: ${distance}px`}
      bind:this={marqueeEl}
    >
      <span class="track-instrument">{display.instrument}</span
      >{#if display.detail}<span class="track-detail">{display.detail}</span>{/if}
    </span>
  </div>
  <Button
    iconOnly
    icon={muted ? VolumeOff : Volume2}
    variant={muted ? 'riot' : 'ghost'}
    label={muted ? `Unmute ${fullName}` : `Mute ${fullName}`}
    {disabled}
    onclick={onToggleMute}
  />
  <Button variant="ghost" label="Solo" {disabled} onclick={onSolo} />
</div>

<style>
  /* One-line grid: label takes the free space and clips; the two buttons
     keep their intrinsic size. Never wraps (ui.md Tracks-tab row rule). */
  .track-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) 0;
  }

  .track-label {
    overflow: hidden;
    min-width: 0;
  }

  .track-marquee {
    display: inline-block;
    white-space: nowrap;
  }

  /* Bounce marquee (plan OQ1 default): scroll to the end, pause, return —
     an alternating animation with hold frames at both extremes, active
     only when measurement flagged real overflow. */
  .track-marquee[data-overflowing='true'] {
    animation: track-marquee-bounce 6s ease-in-out 1s infinite alternate;
  }
  @keyframes track-marquee-bounce {
    0%,
    20% {
      transform: translateX(0);
    }
    80%,
    100% {
      transform: translateX(var(--marquee-distance, 0px));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .track-marquee[data-overflowing='true'] {
      animation: none;
    }
  }

  .track-instrument {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--ink);
  }

  /* De-emphasized detail — kept, not dropped (ui.md part-name rule). */
  .track-detail {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--ink-dim);
    margin-left: var(--space-2);
  }
</style>
