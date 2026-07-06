import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadStoredTheme } from './theme';

// Same node-env localStorage stub as metronome-preference.test.ts/
// session-persistence.test.ts — vitest here runs without jsdom.
function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('loadStoredTheme (4-value data-theme set, brand.md Themes)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it.each(['dark', 'light', 'cyberpunk-dark', 'cyberpunk-light'] as const)('returns %s when stored', (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    expect(loadStoredTheme()).toBe(value);
  });

  it('returns undefined when nothing is stored', () => {
    expect(loadStoredTheme()).toBeUndefined();
  });

  it('returns undefined for a value outside the 4-value set', () => {
    localStorage.setItem(STORAGE_KEY, 'riot-dark');
    expect(loadStoredTheme()).toBeUndefined();
  });
});
