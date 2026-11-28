import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { STORAGE_KEY, horizontalViewStore, loadStoredHorizontalView, persistHorizontalView } from './horizontal-view-preference';

// Same node-env localStorage stub as metronome-preference.test.ts.
function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('horizontal view preference (client-local, per participant)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it('defaults to off (the paged view) when nothing is stored', () => {
    expect(loadStoredHorizontalView()).toBe(false);
  });

  it('round-trips through persistence and updates the reactive store', () => {
    persistHorizontalView(true);
    expect(loadStoredHorizontalView()).toBe(true);
    expect(get(horizontalViewStore)).toBe(true);
    persistHorizontalView(false);
    expect(loadStoredHorizontalView()).toBe(false);
    expect(get(horizontalViewStore)).toBe(false);
  });

  it('treats an unrecognized stored value as off', () => {
    localStorage.setItem(STORAGE_KEY, 'sideways');
    expect(loadStoredHorizontalView()).toBe(false);
  });
});
