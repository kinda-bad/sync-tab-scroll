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
  const stopped = { status: 'stopped' as const, songId: 'sp-1979', serverTick: 0, isHost: true, startTick: 30720 };

  it('seeds the host once per song while stopped at the top', () => {
    const seed = createDefaultStartSeeder();
    expect(seed(stopped)).toBe(30720);
    // Later store updates in the same stopped stretch never re-seed — a
    // host click back to bar 1 (serverTick 0 again) must stick.
    expect(seed(stopped)).toBeNull();
    expect(seed({ ...stopped, serverTick: 30720 })).toBeNull();
  });

  it('re-arms once the session leaves stopped, so every Stop returns to the default start', () => {
    const seed = createDefaultStartSeeder();
    expect(seed(stopped)).toBe(30720);
    expect(seed({ ...stopped, status: 'running', serverTick: 50000 })).toBeNull();
    expect(seed(stopped)).toBe(30720);
  });

  it('seeds again for a different song in the same stopped stretch', () => {
    const seed = createDefaultStartSeeder();
    expect(seed(stopped)).toBe(30720);
    expect(seed({ ...stopped, songId: 'other', startTick: 3840 })).toBe(3840);
  });

  it('never seeds for a non-host, and the arm is consumed so a later host transfer does not re-seed', () => {
    const seed = createDefaultStartSeeder();
    expect(seed({ ...stopped, isHost: false })).toBeNull();
    expect(seed(stopped)).toBeNull();
  });

  it('does not override a position that is already off the top (e.g. after a host reload)', () => {
    const seed = createDefaultStartSeeder();
    expect(seed({ ...stopped, serverTick: 9000 })).toBeNull();
  });

  it('does nothing for a song with no default start, or one that resolves to the top', () => {
    const seed = createDefaultStartSeeder();
    expect(seed({ ...stopped, startTick: null })).toBeNull();
    expect(seed({ ...stopped, songId: 'b', startTick: 0 })).toBeNull();
  });
});
