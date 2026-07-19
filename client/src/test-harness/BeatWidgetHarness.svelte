<script lang="ts">
  import type * as at from '@coderline/alphatab';
  import BeatWidget from '../components/BeatWidget.svelte';
  import { beatAtTick, beatDurationMs as beatDuration } from '../beat-clock';

  // CT harness (T007): props are serializable; the fake score (same shape
  // as beat-clock.test.ts's fixtures) is built here so tests can assert
  // count values at known ticks through the REAL beat-clock derivation.
  export let tick: number = 0;
  export let bars: { durationTicks: number; numerator: number }[] = [{ durationTicks: 3840, numerator: 4 }];
  export let tempo: number = 120;
  export let countInEnabled: boolean = false;
  export let metronomeOn: boolean = false;
  export let phase: 'count-in' | 'playing' | 'idle' = 'idle';
  /** Count-in beat override: during a real count-in there is no tick advance, the scheduler supplies the 1..beatCount beat index directly. */
  export let countInBeat: number | null = null;

  $: score = {
    tempo,
    masterBars: bars.map((b) => ({
      timeSignatureNumerator: b.numerator,
      timeSignatureDenominator: 4,
      tempoAutomations: [],
      calculateDuration: () => b.durationTicks,
    })),
  } as unknown as at.model.Score;

  $: position = beatAtTick(score, tick);
  $: beatMs = beatDuration(score, tick);
</script>

<BeatWidget
  {countInEnabled}
  {metronomeOn}
  {phase}
  beatInBar={phase === 'count-in' && countInBeat !== null ? countInBeat : position.beatInBar}
  beatCount={position.beatCount}
  barNumber={position.barNumber}
  beatDurationMs={beatMs}
/>
