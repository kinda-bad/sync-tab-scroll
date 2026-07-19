import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  loadStoredLyricsTickerPosition,
  persistLyricsTickerPosition,
} from './lyrics-ticker-position-preference';

// Same node-env localStorage stub as lyrics-ticker-font-size-preference.test.ts.
function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

// T005 (tasks-icons-a11y-ticker-a10d.md, feature
// lyrics-ticker-position-preference): top | bottom, default bottom (today's
// behavior), persisted client-side — mirrors the font-size preference.
describe('lyrics ticker position preference (client-local, per participant)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it('defaults to bottom when nothing is stored', () => {
    expect(loadStoredLyricsTickerPosition()).toBe('bottom');
  });

  it('round-trips through persistence', () => {
    persistLyricsTickerPosition('top');
    expect(loadStoredLyricsTickerPosition()).toBe('top');
    persistLyricsTickerPosition('bottom');
    expect(loadStoredLyricsTickerPosition()).toBe('bottom');
  });

  it('treats a garbage stored value as bottom', () => {
    localStorage.setItem(STORAGE_KEY, 'sideways');
    expect(loadStoredLyricsTickerPosition()).toBe('bottom');
  });
});
