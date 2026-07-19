import type * as at from '@coderline/alphatab';
import { TICKS_PER_QUARTER_NOTE, localTempoAtTick } from './tempo-lookup';

/** Where a tick falls in the score's beat grid (count-in-metronome-beat-widget, ui.md). */
export interface BeatClockPosition {
  /** 1-based bar (measure) number. */
  barNumber: number;
  /** 1-based beat within the bar, 1..beatCount. */
  beatInBar: number;
  /** The bar's time-signature numerator — the count the widget counts to (never a hard-coded 4; plan Open Question 1). */
  beatCount: number;
}

/**
 * Maps a tick position to `{barNumber, beatInBar, beatCount}` by walking
 * `score.masterBars` (the same accumulate-durations walk as
 * `localTempoAtTick`), reading each bar's real time-signature numerator. A
 * bar's beat length is `calculateDuration() / numerator` — correct for any
 * denominator, since the duration already reflects it. Ticks at/before 0
 * (the count-in region — alphaTab holds position at the start while the
 * count-in bar clicks) clamp to bar 1 beat 1; ticks past the end clamp to
 * the last bar's last beat.
 */
export function beatAtTick(score: at.model.Score, tick: number): BeatClockPosition {
  const bars = score.masterBars;
  let cumulative = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const duration = bar.calculateDuration();
    const beatCount = Math.max(1, bar.timeSignatureNumerator);
    const isLast = i === bars.length - 1;

    if (tick < cumulative + duration || isLast) {
      const offset = Math.max(0, tick - cumulative);
      const beatLength = duration / beatCount;
      const beatInBar = Math.min(beatCount, Math.floor(offset / beatLength) + 1);
      return { barNumber: i + 1, beatInBar, beatCount };
    }
    cumulative += duration;
  }

  // Empty masterBars (defensive — a loaded score always has at least one).
  return { barNumber: 1, beatInBar: 1, beatCount: 4 };
}

/**
 * Real duration of one beat at `tick`, in ms — the bar's tick length split
 * by its numerator, timed at `localTempoAtTick`'s bpm (the widget schedules
 * its fill animation off this, never a fixed-interval timer; ui.md).
 */
export function beatDurationMs(score: at.model.Score, tick: number): number {
  const bars = score.masterBars;
  let cumulative = 0;
  let beatTicks = TICKS_PER_QUARTER_NOTE;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const duration = bar.calculateDuration();
    beatTicks = duration / Math.max(1, bar.timeSignatureNumerator);
    if (tick < cumulative + duration) break;
    cumulative += duration;
  }

  const bpm = localTempoAtTick(score, tick);
  return (beatTicks * 60000) / (bpm * TICKS_PER_QUARTER_NOTE);
}
