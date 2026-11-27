import { describe, expect, it, vi } from 'vitest';
import type * as at from '@coderline/alphatab';
import { createDefaultStartSeeder, defaultStartTick } from './default-start';

/**
 * Fake score/tick-lookup carrying only what default-start.ts reads — same
 * "fake score" pattern as beat-clock.test.ts / tempo-lookup.test.ts.
 */
const BAR = 3840; // one 4/4 bar at 960 ticks per quarter
function fakeScore(bars: number): at.model.Score {
  return { masterBars: Array.from({ length: bars }, (_, i) => ({ index: i, start: i * BAR })) } as unknown as at.model.Score;
}

describe('defaultStartTick', () => {
  it('maps a 1-based bar through the tick lookup (playback ticks, repeat-aware)', () => {
    const score = fakeScore(12);
    // A playback tick that differs from masterBar.start, as it would after a repeat.
    const tickCache = { getMasterBarStart: vi.fn((bar: { index: number }) => bar.index * BAR + 7) } as unknown as at.midi.MidiTickLookup;

    expect(defaultStartTick(score, tickCache, 9)).toBe(8 * BAR + 7);
    expect(tickCache.getMasterBarStart).toHaveBeenCalledWith(score.masterBars[8]);
  });

  it('falls back to masterBar.start when no tick lookup exists yet', () => {
    expect(defaultStartTick(fakeScore(12), null, 9)).toBe(8 * BAR);
  });

  it('returns null with no bar, or a bar past the end of the score', () => {
    const score = fakeScore(12);
    expect(defaultStartTick(score, null, undefined)).toBeNull();
    expect(defaultStartTick(score, null, 13)).toBeNull();
    expect(defaultStartTick(score, null, 12)).toBe(11 * BAR);
  });

  it('returns null with no score', () => {
    expect(defaultStartTick(null, null, 9)).toBeNull();
  });
});

describe('createDefaultStartSeeder', () => {
  const stopped = { status: 'stopped' as const, songId: 'sp-1979', markerBar: 9 as number | null, serverTick: 0, isHost: true, startTick: 30720 as number | null };

  it('seeks the host to the start marker once per stopped stretch', () => {
    const seed = createDefaultStartSeeder();
    expect(seed(stopped)).toBe(30720);
    // Later store updates in the same stopped stretch never re-seek — a host
    // click back to bar 1 (serverTick 0 again) must stick.
    expect(seed(stopped)).toBeNull();
    expect(seed({ ...stopped, serverTick: 30720 })).toBeNull();
  });

  it('re-arms once the session leaves stopped, so every Stop returns to the marker', () => {
    const seed = createDefaultStartSeeder();
    expect(seed(stopped)).toBe(30720);
    expect(seed({ ...stopped, status: 'running', serverTick: 50000 })).toBeNull();
    expect(seed(stopped)).toBe(30720);
  });

  it('a cleared marker never seeks, so Stop stays at bar 1', () => {
    const seed = createDefaultStartSeeder();
    expect(seed({ ...stopped, markerBar: null, startTick: null })).toBeNull();
    expect(seed({ ...stopped, status: 'running', markerBar: null, startTick: null })).toBeNull();
    expect(seed({ ...stopped, markerBar: null, startTick: null })).toBeNull();
  });

  it('seeks again when the host moves the marker while stopped', () => {
    const seed = createDefaultStartSeeder();
    expect(seed(stopped)).toBe(30720);
    expect(seed({ ...stopped, markerBar: 5, startTick: 14880, serverTick: 30720 })).toBe(14880);
  });

  it('a marker on bar 1 seeks back to the top from a clicked position', () => {
    const seed = createDefaultStartSeeder();
    expect(seed({ ...stopped, markerBar: 1, startTick: 0, serverTick: 9000 })).toBe(0);
  });

  it('seeks again for a different song in the same stopped stretch', () => {
    const seed = createDefaultStartSeeder();
    expect(seed(stopped)).toBe(30720);
    expect(seed({ ...stopped, songId: 'other', markerBar: 2, startTick: 3840 })).toBe(3840);
  });

  it('never seeks for a non-host, and the arm is consumed so a later host transfer does not re-seek', () => {
    const seed = createDefaultStartSeeder();
    expect(seed({ ...stopped, isHost: false })).toBeNull();
    expect(seed(stopped)).toBeNull();
  });

  it('skips a seek that would not move anything, or a marker past the end of the score', () => {
    const seed = createDefaultStartSeeder();
    expect(seed({ ...stopped, serverTick: 30720 })).toBeNull();
    expect(seed({ ...stopped, songId: 'b', startTick: null })).toBeNull();
  });
});
