import { describe, expect, it } from 'vitest';
import type * as at from '@coderline/alphatab';
import { TICKS_PER_QUARTER_NOTE } from './tempo-lookup';
import { beatAtTick, beatDurationMs } from './beat-clock';

/**
 * Fixture masterbars carry only the fields beat-clock.ts (and its
 * tempo-lookup dependency) actually read — same "fake score" pattern as
 * tempo-lookup.test.ts / lyrics-gap-timing.test.ts.
 */
function fakeMasterBar(opts: { durationTicks: number; numerator: number; denominator?: number; tempo?: number }) {
  return {
    timeSignatureNumerator: opts.numerator,
    timeSignatureDenominator: opts.denominator ?? 4,
    tempoAutomations: opts.tempo !== undefined ? [{ type: 0, value: opts.tempo }] : [],
    calculateDuration: () => opts.durationTicks,
  };
}

function fakeScore(tempo: number, masterBars: ReturnType<typeof fakeMasterBar>[]) {
  return { tempo, masterBars } as unknown as at.model.Score;
}

const Q = TICKS_PER_QUARTER_NOTE;

describe('beatAtTick', () => {
  const fourFour = () => fakeScore(120, [fakeMasterBar({ durationTicks: 4 * Q, numerator: 4 }), fakeMasterBar({ durationTicks: 4 * Q, numerator: 4 })]);

  it.fails('counts 4/4 beats within bar 1 at a steady tempo', () => {
    const score = fourFour();
    expect(beatAtTick(score, 0)).toEqual({ barNumber: 1, beatInBar: 1, beatCount: 4 });
    expect(beatAtTick(score, Q)).toEqual({ barNumber: 1, beatInBar: 2, beatCount: 4 });
    expect(beatAtTick(score, 3 * Q + 100)).toEqual({ barNumber: 1, beatInBar: 4, beatCount: 4 });
  });

  it.fails('rolls into bar 2 at the bar boundary', () => {
    const score = fourFour();
    expect(beatAtTick(score, 4 * Q)).toEqual({ barNumber: 2, beatInBar: 1, beatCount: 4 });
    expect(beatAtTick(score, 7 * Q + 1)).toEqual({ barNumber: 2, beatInBar: 4, beatCount: 4 });
  });

  it.fails('counts to the actual numerator in a non-4/4 bar', () => {
    // Bar 1 is 3/4, bar 2 is 7/8.
    const score = fakeScore(120, [
      fakeMasterBar({ durationTicks: 3 * Q, numerator: 3 }),
      fakeMasterBar({ durationTicks: 3.5 * Q, numerator: 7, denominator: 8 }),
    ]);
    expect(beatAtTick(score, 2 * Q)).toEqual({ barNumber: 1, beatInBar: 3, beatCount: 3 });
    // 7/8: each beat is an eighth (Q/2). Tick 3Q + 3*(Q/2) = start of beat 4.
    expect(beatAtTick(score, 3 * Q + 1.5 * Q)).toEqual({ barNumber: 2, beatInBar: 4, beatCount: 7 });
  });

  it.fails('clamps a negative (count-in region) tick to bar 1 beat 1 with bar 1 beat count', () => {
    const score = fakeScore(120, [fakeMasterBar({ durationTicks: 3 * Q, numerator: 3 })]);
    expect(beatAtTick(score, -Q)).toEqual({ barNumber: 1, beatInBar: 1, beatCount: 3 });
  });

  it.fails('clamps a tick past the end of the score to the last bar last beat', () => {
    const score = fourFour();
    expect(beatAtTick(score, 100 * Q)).toEqual({ barNumber: 2, beatInBar: 4, beatCount: 4 });
  });
});

describe('beatDurationMs', () => {
  it.fails('is the quarter-note duration in 4/4 at a steady tempo', () => {
    const score = fakeScore(120, [fakeMasterBar({ durationTicks: 4 * Q, numerator: 4 })]);
    expect(beatDurationMs(score, 0)).toBeCloseTo(500, 5);
  });

  it.fails('follows a mid-song tempo change via localTempoAtTick', () => {
    const score = fakeScore(120, [
      fakeMasterBar({ durationTicks: 4 * Q, numerator: 4, tempo: 120 }),
      fakeMasterBar({ durationTicks: 4 * Q, numerator: 4, tempo: 60 }),
    ]);
    expect(beatDurationMs(score, 0)).toBeCloseTo(500, 5);
    expect(beatDurationMs(score, 4 * Q)).toBeCloseTo(1000, 5);
  });

  it.fails('scales with the bar duration in non-quarter denominators (7/8)', () => {
    // 7/8 at 120bpm: a beat is an eighth note = 250ms.
    const score = fakeScore(120, [fakeMasterBar({ durationTicks: 3.5 * Q, numerator: 7, denominator: 8 })]);
    expect(beatDurationMs(score, 0)).toBeCloseTo(250, 5);
  });
});
