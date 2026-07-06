import { describe, expect, it } from 'vitest';
import { computeGapTiming, findLyricGaps } from './lyrics-gap-timing';
import type * as at from '@coderline/alphatab';

/**
 * Fixture masterbars carry only the fields lyrics-gap-timing.ts actually
 * reads (same "fake score" pattern as lyrics-beat-walk.test.ts) — real
 * alphaTab MasterBar/Score instances require far more setup than this
 * module's logic depends on.
 *
 * `calculateDuration()` returns the bar's length in midi ticks; alphaTab's
 * own fixed tick resolution is 960 ticks per quarter note (MidiUtils.
 * QuarterTime, not part of the public API surface but a stable constant
 * this module hardcodes — see its own doc comment).
 */
const TICKS_PER_QUARTER = 960;

function fakeMasterBar(opts: { start: number; durationTicks: number; timeSignatureNumerator: number; tempo?: number }) {
  return {
    start: opts.start,
    timeSignatureNumerator: opts.timeSignatureNumerator,
    tempoAutomations: opts.tempo !== undefined ? [{ type: 0, value: opts.tempo }] : [],
    calculateDuration: () => opts.durationTicks,
  };
}

function fakeScore(tempo: number, masterBars: ReturnType<typeof fakeMasterBar>[]) {
  return { tempo, masterBars } as unknown as at.model.Score;
}

describe('computeGapTiming', () => {
  it('computes the local measure length and 4 preceding beat timestamps at a constant 120bpm, 4/4', () => {
    // 120bpm, 4/4: one quarter note = 500ms, one measure (4 quarter notes) = 2000ms.
    // Ticks per measure = 4 * 960 = 3840.
    const score = fakeScore(120, [fakeMasterBar({ start: 0, durationTicks: 3840, timeSignatureNumerator: 4 })]);

    // Gap window exceeds the 2000ms measure length, so it qualifies.
    const result = computeGapTiming(score, 0, 8400);

    expect(result.qualifies).toBe(true);
    expect(result.measureDurationMs).toBeCloseTo(2000, 5);
    // 4 beats immediately preceding endMs (8400), each 500ms apart, ascending.
    expect(result.beatTimestampsMs.map((t) => Math.round(t))).toEqual([6400, 6900, 7400, 7900]);
  });

  it('does not qualify a gap shorter than or equal to one measure', () => {
    const score = fakeScore(120, [fakeMasterBar({ start: 0, durationTicks: 3840, timeSignatureNumerator: 4 })]);

    // Exactly one measure (2000ms) — spec: "one measure or shorter" gets no indicator.
    const result = computeGapTiming(score, 0, 2000);

    expect(result.qualifies).toBe(false);
  });

  it('uses the local (nearest-to-endMs) tempo, not the song\'s first/initial tempo, across a tempo change', () => {
    // Bar 0: 90bpm, 4/4, one measure = 4 * (60000/90) = 2666.67ms.
    // Bar 1 (after a tempo change to 150bpm): one measure = 4 * (60000/150) = 1600ms.
    const bar0DurationTicks = 4 * TICKS_PER_QUARTER;
    const bar0DurationMs = (bar0DurationTicks * 60000) / (90 * TICKS_PER_QUARTER);
    const bar1DurationTicks = 4 * TICKS_PER_QUARTER;

    const score = fakeScore(90, [
      fakeMasterBar({ start: 0, durationTicks: bar0DurationTicks, timeSignatureNumerator: 4, tempo: 90 }),
      fakeMasterBar({ start: bar0DurationTicks, durationTicks: bar1DurationTicks, timeSignatureNumerator: 4, tempo: 150 }),
    ]);

    // The gap spans both bars in real time (bar0 ends at ~2666.67ms; endMs
    // lands inside bar1, which starts right after). Gap window: [0, 4000].
    // If the *local* (bar1, 150bpm) tempo is used for the measure length and
    // beat math, the beat duration is 1600/4 = 400ms; if the song's first/
    // initial tempo (90bpm) were wrongly used instead, beat duration would be
    // 666.67ms and this assertion would fail.
    const endMs = bar0DurationMs + 1333.33; // partway into bar1
    const result = computeGapTiming(score, 0, endMs);

    expect(result.qualifies).toBe(true);
    expect(result.measureDurationMs).toBeCloseTo(1600, 1);
    const beatDurationMs = result.beatTimestampsMs[1] - result.beatTimestampsMs[0];
    expect(beatDurationMs).toBeCloseTo(400, 1);
  });
});

describe('findLyricGaps', () => {
  // 120bpm, 4/4 throughout — one measure = 2000ms — for every fixture below.
  const score = fakeScore(120, [fakeMasterBar({ start: 0, durationTicks: 3840, timeSignatureNumerator: 4 })]);

  it('reports a qualifying leading gap (song start to the first real line) at insertBeforeIndex 0', () => {
    const allLines = [
      { timeMs: 8390, text: 'first real line' },
      { timeMs: 10420, text: '' },
      { timeMs: 10680, text: 'second real line' },
    ];

    const gaps = findLyricGaps(score, allLines);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ insertBeforeIndex: 0, startMs: 0, endMs: 8390 });
    expect(gaps[0].timing.qualifies).toBe(true);
  });

  it('reports no gap for a leading or inter-line gap of one measure or shorter', () => {
    const allLines = [
      { timeMs: 0, text: 'first real line' },
      { timeMs: 2000, text: '' },
      { timeMs: 2000, text: 'second real line' },
    ];

    expect(findLyricGaps(score, allLines)).toEqual([]);
  });

  it('reports a qualifying inter-line gap at the insertBeforeIndex of the next real line', () => {
    const allLines = [
      { timeMs: 0, text: 'first real line' },
      { timeMs: 1000, text: '' },
      { timeMs: 20000, text: 'second real line' },
      { timeMs: 21000, text: 'third real line' },
    ];

    const gaps = findLyricGaps(score, allLines);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ insertBeforeIndex: 1, startMs: 1000, endMs: 20000 });
  });
});
