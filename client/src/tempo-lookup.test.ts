import { describe, expect, it } from 'vitest';
import { TICKS_PER_QUARTER_NOTE, localTempoAtTick, ticksToMs } from './tempo-lookup';
import type * as at from '@coderline/alphatab';

/**
 * Fixture masterbars carry only the fields tempo-lookup.ts actually reads —
 * same "fake score" pattern as lyrics-gap-timing.test.ts.
 */
function fakeMasterBar(opts: { start: number; durationTicks: number; tempo?: number }) {
  return {
    start: opts.start,
    tempoAutomations: opts.tempo !== undefined ? [{ type: 0, value: opts.tempo }] : [],
    calculateDuration: () => opts.durationTicks,
  };
}

function fakeScore(tempo: number, masterBars: ReturnType<typeof fakeMasterBar>[]) {
  return { tempo, masterBars } as unknown as at.model.Score;
}

describe('ticksToMs', () => {
  it('converts ticks to ms at a given bpm', () => {
    // 120bpm: one quarter note (960 ticks) = 500ms.
    expect(ticksToMs(TICKS_PER_QUARTER_NOTE, 120)).toBeCloseTo(500, 5);
  });
});

describe('localTempoAtTick', () => {
  it('returns the carried-forward tempo for a tick within a bar with no automation of its own', () => {
    const bar0DurationTicks = 4 * TICKS_PER_QUARTER_NOTE;
    const score = fakeScore(90, [
      fakeMasterBar({ start: 0, durationTicks: bar0DurationTicks, tempo: 90 }),
      fakeMasterBar({ start: bar0DurationTicks, durationTicks: bar0DurationTicks }),
    ]);

    // Tick within bar1, which has no automation of its own — carries forward 90.
    const tick = bar0DurationTicks + 100;
    expect(localTempoAtTick(score, tick)).toBe(90);
  });

  it('returns the bar-local tempo for a tick within a bar that has its own automation', () => {
    const bar0DurationTicks = 4 * TICKS_PER_QUARTER_NOTE;
    const score = fakeScore(90, [
      fakeMasterBar({ start: 0, durationTicks: bar0DurationTicks, tempo: 90 }),
      fakeMasterBar({ start: bar0DurationTicks, durationTicks: bar0DurationTicks, tempo: 150 }),
    ]);

    const tick = bar0DurationTicks + 100;
    expect(localTempoAtTick(score, tick)).toBe(150);
  });

  it('returns the last bar\'s tempo for a tick past the end of the score', () => {
    const bar0DurationTicks = 4 * TICKS_PER_QUARTER_NOTE;
    const score = fakeScore(90, [
      fakeMasterBar({ start: 0, durationTicks: bar0DurationTicks, tempo: 90 }),
      fakeMasterBar({ start: bar0DurationTicks, durationTicks: bar0DurationTicks, tempo: 150 }),
    ]);

    const tick = bar0DurationTicks * 2 + 5000;
    expect(localTempoAtTick(score, tick)).toBe(150);
  });
});
