import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadStoredMetronome, persistMetronome } from './metronome-preference';

// Same node-env localStorage stub as session-persistence.test.ts — vitest
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

describe('metronome preference (client-local, per participant)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it('defaults to off when nothing is stored', () => {
    expect(loadStoredMetronome()).toBe(false);
  });

  it('round-trips through persistence', () => {
    persistMetronome(true);
    expect(loadStoredMetronome()).toBe(true);
    persistMetronome(false);
    expect(loadStoredMetronome()).toBe(false);
  });

  it('treats a garbage stored value as off', () => {
    localStorage.setItem(STORAGE_KEY, 'banana');
    expect(loadStoredMetronome()).toBe(false);
  });
});
