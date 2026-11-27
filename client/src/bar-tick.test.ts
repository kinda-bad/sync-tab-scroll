import { describe, expect, it } from 'vitest';
import type * as at from '@coderline/alphatab';
import { barAtTick, barEndTick, barStartTick, barTickMapFromLookup, barTickMapFromScore, type BarTickMap } from './bar-tick';

const BAR = 3840; // one 4/4 bar at 960 ticks per quarter

// Bars 1-2 repeated once, then bar 3: playback order 1, 2, 1, 2, 3.
const repeated: BarTickMap = {
  plays: [
    { bar: 1, start: 0, end: BAR },
    { bar: 2, start: BAR, end: 2 * BAR },
    { bar: 1, start: 2 * BAR, end: 3 * BAR },
    { bar: 2, start: 3 * BAR, end: 4 * BAR },
    { bar: 3, start: 4 * BAR, end: 5 * BAR },
  ],
};

describe('barStartTick / barEndTick', () => {
  it('maps a 1-based bar to its first pass, like the start marker', () => {
    expect(barStartTick(repeated, 1)).toBe(0);
    expect(barStartTick(repeated, 3)).toBe(4 * BAR);
    expect(barEndTick(repeated, 2)).toBe(2 * BAR);
    expect(barEndTick(repeated, 3)).toBe(5 * BAR);
  });

  it('returns null for a bar outside the score or not a whole number', () => {
    expect(barStartTick(repeated, 0)).toBeNull();
    expect(barStartTick(repeated, 4)).toBeNull();
    expect(barEndTick(repeated, 2.5)).toBeNull();
  });
});

describe('barAtTick', () => {
  it('names the bar playing at a tick, repeats included', () => {
    expect(barAtTick(repeated, 0)).toBe(1);
    expect(barAtTick(repeated, BAR + 5)).toBe(2);
    expect(barAtTick(repeated, 2 * BAR)).toBe(1);
    expect(barAtTick(repeated, 4 * BAR)).toBe(3);
  });

  it('clamps past the end to the last bar, and before the start to the first', () => {
    expect(barAtTick(repeated, 99 * BAR)).toBe(3);
    expect(barAtTick(repeated, -1)).toBe(1);
  });

  it('returns null with no bars', () => {
    expect(barAtTick({ plays: [] }, 0)).toBeNull();
  });
});

describe('building the map', () => {
  it('reads alphaTab’s playback-order lookup', () => {
    const lookup = {
      masterBars: [
        { masterBar: { index: 0 }, start: 0, end: BAR },
        { masterBar: { index: 0 }, start: BAR, end: 2 * BAR },
      ],
    } as unknown as at.midi.MidiTickLookup;
    expect(barTickMapFromLookup(lookup)).toEqual({ plays: [{ bar: 1, start: 0, end: BAR }, { bar: 1, start: BAR, end: 2 * BAR }] });
  });

  it('falls back to written bar starts before the MIDI exists', () => {
    const score = {
      masterBars: [0, 1].map((i) => ({ index: i, start: i * BAR, calculateDuration: () => BAR })),
    } as unknown as at.model.Score;
    expect(barTickMapFromScore(score)).toEqual({ plays: [{ bar: 1, start: 0, end: BAR }, { bar: 2, start: BAR, end: 2 * BAR }] });
  });
});
