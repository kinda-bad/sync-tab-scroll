import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  loadStoredMeasureMarkers,
  persistMeasureMarkers,
} from './lyrics-measure-markers-preference';

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

describe('measure markers preference (client-local, per participant)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it('defaults to off when nothing is stored', () => {
    expect(loadStoredMeasureMarkers()).toBe(false);
  });

  it('round-trips through persistence', () => {
    persistMeasureMarkers(true);
    expect(loadStoredMeasureMarkers()).toBe(true);
    persistMeasureMarkers(false);
    expect(loadStoredMeasureMarkers()).toBe(false);
  });

  it('treats a garbage stored value as off', () => {
    localStorage.setItem(STORAGE_KEY, 'banana');
    expect(loadStoredMeasureMarkers()).toBe(false);
  });
});
