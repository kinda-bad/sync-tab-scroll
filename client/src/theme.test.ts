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

describe('loadStoredTheme (6-value data-theme set, brand.md Themes)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it.each(['dark', 'light', 'cyberpunk-dark', 'cyberpunk-light', 'mono-dark', 'mono-light'] as const)('returns %s when stored', (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    expect(loadStoredTheme()).toBe(value);
  });

  it('returns undefined when nothing is stored', () => {
    expect(loadStoredTheme()).toBeUndefined();
  });

  it.each(['riot-dark', 'mono', 'mono-sepia'])('returns undefined for %s, outside the 6-value set', (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    expect(loadStoredTheme()).toBeUndefined();
  });
});
