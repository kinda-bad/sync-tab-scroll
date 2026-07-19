import type * as at from '@coderline/alphatab';

/** Where a tick falls in the score's beat grid (count-in-metronome-beat-widget, ui.md). */
export interface BeatClockPosition {
  /** 1-based bar (measure) number. */
  barNumber: number;
  /** 1-based beat within the bar, 1..beatCount. */
  beatInBar: number;
  /** The bar's time-signature numerator — the count the widget counts to (never a hard-coded 4; plan Open Question 1). */
  beatCount: number;
}

/** Red-state stub (T006, constitution Principle VII) — implementation lands on the paired green commit. */
export function beatAtTick(_score: at.model.Score, _tick: number): BeatClockPosition {
  return { barNumber: 1, beatInBar: 1, beatCount: 4 };
}

/** Red-state stub (T006). */
export function beatDurationMs(_score: at.model.Score, _tick: number): number {
  return 0;
}
