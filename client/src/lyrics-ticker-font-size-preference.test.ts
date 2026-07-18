import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  loadStoredLyricsTickerFontSize,
  persistLyricsTickerFontSize,
} from './lyrics-ticker-font-size-preference';

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

describe('lyrics ticker font-size preference (client-local, per participant)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it('defaults to medium when nothing is stored', () => {
    expect(loadStoredLyricsTickerFontSize()).toBe('medium');
  });

  it('round-trips through persistence', () => {
    persistLyricsTickerFontSize('small');
    expect(loadStoredLyricsTickerFontSize()).toBe('small');
    persistLyricsTickerFontSize('large');
    expect(loadStoredLyricsTickerFontSize()).toBe('large');
    persistLyricsTickerFontSize('huge');
    expect(loadStoredLyricsTickerFontSize()).toBe('huge');
    persistLyricsTickerFontSize('medium');
    expect(loadStoredLyricsTickerFontSize()).toBe('medium');
  });

  it('treats a garbage stored value as medium', () => {
    localStorage.setItem(STORAGE_KEY, 'banana');
    expect(loadStoredLyricsTickerFontSize()).toBe('medium');
  });
});
