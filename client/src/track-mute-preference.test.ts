import { beforeEach, describe, expect, it } from 'vitest';
import { loadStoredTrackMute, persistTrackMute } from './track-mute-preference';

// Same node-env localStorage stub as metronome-preference.test.ts — vitest
// here runs without jsdom.
function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('track mute preference (client-local, per participant, per song+track)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it('defaults to unmuted (false) when nothing is stored', () => {
    expect(loadStoredTrackMute('song-1', 0)).toBe(false);
  });

  it('round-trips through persistence', () => {
    persistTrackMute('song-1', 2, true);
    expect(loadStoredTrackMute('song-1', 2)).toBe(true);
    persistTrackMute('song-1', 2, false);
    expect(loadStoredTrackMute('song-1', 2)).toBe(false);
  });

  it('keeps mute preferences separate per song for the same track index', () => {
    persistTrackMute('song-1', 0, true);
    expect(loadStoredTrackMute('song-2', 0)).toBe(false);
  });

  it('keeps mute preferences separate per track index within the same song', () => {
    persistTrackMute('song-1', 0, true);
    expect(loadStoredTrackMute('song-1', 1)).toBe(false);
  });
});
