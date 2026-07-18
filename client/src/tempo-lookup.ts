import type * as at from '@coderline/alphatab';

/**
 * alphaTab's fixed MIDI tick resolution (`MidiUtils.QuarterTime` internally
 * — not part of the public `@coderline/alphatab` API surface, so this
 * module hardcodes the same stable constant rather than importing it).
 * `MasterBar.calculateDuration()` returns a bar's length in these ticks;
 * converting to real time at a given tempo is standard MIDI tick math:
 * ms = ticks * (60000 / (bpm * ticksPerQuarterNote)).
 */
export const TICKS_PER_QUARTER_NOTE = 960;

export function ticksToMs(ticks: number, bpm: number): number {
  return (ticks * 60000) / (bpm * TICKS_PER_QUARTER_NOTE);
}

/**
 * Walks `score.masterBars` from the start, accumulating each bar's tick
 * range and tracking tempo from each bar's `tempoAutomations[0].value` when
 * present (carried forward from the previous bar/song-initial `score.tempo`
 * otherwise — the same tempo-walk `lyrics-gap-timing.ts` uses), returning
 * the tempo of whichever masterBar contains `tick` (or the last bar's tempo
 * if `tick` is past the end of the score).
 */
export function localTempoAtTick(score: at.model.Score, tick: number): number {
  let tempo = score.tempo;
  let cumulativeTicks = 0;

  for (const masterBar of score.masterBars) {
    const automations = masterBar.tempoAutomations;
    if (automations && automations.length > 0) {
      tempo = automations[0].value;
    }

    const durationTicks = masterBar.calculateDuration();
    const barEndTicks = cumulativeTicks + durationTicks;

    const isLastBar = masterBar === score.masterBars[score.masterBars.length - 1];
    if (tick < barEndTicks || isLastBar) {
      return tempo;
    }

    cumulativeTicks = barEndTicks;
  }

  return tempo;
}
