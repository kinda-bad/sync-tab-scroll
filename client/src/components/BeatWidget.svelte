<script lang="ts">
  // Count-In & Metronome Beat Widget (ui.md; count-in-metronome-beat-widget).
  // One shape whose fill color animates on every beat, alternating direction
  // each beat (primary→secondary on odd→even, secondary→primary on
  // even→odd — --riot/--hazard, the brand.md theme token pair). Two modes
  // sharing the one widget:
  //  - count-in: counts DOWN beatCount→1, shown to every participant, gated
  //    on the session's countInEnabled (same rule as the count-in click);
  //  - playback: counts UP 1→beatCount plus a labeled, less-prominent
  //    measure number, gated on the participant's own Metronome preference.
  // Beat timing arrives via props from real beat boundaries
  // (beat-clock.ts / playerPositionChanged in the Bar wiring) — this
  // component never runs its own interval timer.
  export let countInEnabled: boolean = false;
  export let metronomeOn: boolean = false;
  export let phase: 'count-in' | 'playing' | 'idle' = 'idle';
  export let beatInBar: number = 1;
  export let beatCount: number = 4;
  export let barNumber: number = 1;
  export let beatDurationMs: number = 500;

  $: showCountIn = phase === 'count-in' && countInEnabled;
  $: showPlayback = phase === 'playing' && metronomeOn;
  $: visible = showCountIn || showPlayback;

  // Count-in counts down (beat 1 of 4 shows "4", beat 4 shows "1");
  // playback counts up.
  $: displayCount = showCountIn ? beatCount - beatInBar + 1 : beatInBar;

  // Fill direction alternates each beat: odd beats sweep primary→secondary
  // (left-anchored), even beats secondary→primary (right-anchored).
  $: parity = beatInBar % 2 === 1 ? 'odd' : 'even';
</script>

{#if visible}
  <div
    class="beat-widget"
    data-testid="beat-widget"
    data-beat={beatInBar}
    data-beat-total={beatCount}
    data-parity={parity}
    style={`--beat-ms: ${beatDurationMs}ms`}
  >
    <!-- Measure slot LEFT of the beat count (feedback beat-widget-layout
         F001/F002): always rendered with fixed width so the beat count's
         horizontal position is identical in count-in mode (contents
         hidden, space reserved) and playback mode — the countdown becomes
         the metronome without the beat number moving. The measure is the
         number stacked over a small "MES" caption, no "Measure 12" prose. -->
    <div class="measure-slot" data-testid="measure-slot" class:measure-hidden={!showPlayback}>
      <span class="measure-number" data-testid="beat-measure-number">{barNumber}</span>
      <span class="measure-caption" data-testid="beat-measure-caption">MES</span>
    </div>
    <div class="beat-shape">
      {#key beatInBar}
        <div class="beat-fill" data-testid="beat-fill"></div>
      {/key}
      <span class="beat-count" data-testid="beat-count">{displayCount}</span>
    </div>
  </div>
{/if}

<style>
  .beat-widget {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* The one shape: a squared badge sized to sit alongside the Bar's icon
     controls. Its resting surface is the secondary token; .beat-fill sweeps
     the primary across it each beat. */
  .beat-shape {
    position: relative;
    width: 2rem;
    height: 2rem;
    overflow: hidden;
    background: var(--hazard);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Re-created per beat via {#key beatInBar} so the sweep restarts exactly
     on each real beat boundary — duration comes from --beat-ms
     (beatDurationMs, tempo-accurate via localTempoAtTick), never a fixed
     interval. Odd beats sweep primary in from the left over the secondary
     base; even beats sweep from the right with the colors swapped —
     the alternating-direction fill (ui.md). */
  .beat-fill {
    position: absolute;
    inset: 0;
    animation: beat-sweep var(--beat-ms, 500ms) linear forwards;
  }
  [data-parity='odd'] .beat-shape {
    background: var(--hazard);
  }
  [data-parity='odd'] .beat-fill {
    background: var(--riot);
    transform-origin: left;
  }
  [data-parity='even'] .beat-shape {
    background: var(--riot);
  }
  [data-parity='even'] .beat-fill {
    background: var(--hazard);
    transform-origin: right;
  }
  @keyframes beat-sweep {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .beat-fill {
      animation: none;
      transform: scaleX(1);
    }
  }

  .beat-count {
    position: relative;
    z-index: 1;
    font-weight: 700;
    font-size: 1rem;
    color: var(--bg);
    font-variant-numeric: tabular-nums;
  }

  /* Less prominent than the beat count, stacked number-over-caption.
     Fixed width so the reserved space is identical whether or not the
     measure is shown — the beat count never moves across the
     count-in→playback transition. */
  .measure-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    flex: none;
  }

  /* Space reserved, contents invisible (count-in mode). */
  .measure-hidden > * {
    visibility: hidden;
  }

  .measure-number {
    color: var(--ink-dim);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .measure-caption {
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1.1;
  }
</style>
