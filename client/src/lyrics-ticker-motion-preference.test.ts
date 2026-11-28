import { beforeEach, describe, expect, it } from 'vitest';
import {
  ANCHOR_STORAGE_KEY,
  SCROLL_STORAGE_KEY,
  loadStoredLyricsTickerAnchor,
  loadStoredLyricsTickerScroll,
  persistLyricsTickerAnchor,
  persistLyricsTickerScroll,
} from './lyrics-ticker-motion-preference';

// Same node-env localStorage stub as lyrics-ticker-position-preference.test.ts.
function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

// lyrics-ticker-scroll-modes: two personal, this-device-only settings for
// how the ticker moves. Defaults keep today's behavior (center, constant).
describe('lyrics ticker motion preferences (client-local, per participant)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  });

  it('defaults to a centered anchor and constant scrolling', () => {
    expect(loadStoredLyricsTickerAnchor()).toBe('center');
    expect(loadStoredLyricsTickerScroll()).toBe('constant');
  });

  it('round-trips each value through persistence', () => {
    persistLyricsTickerAnchor('left');
    expect(loadStoredLyricsTickerAnchor()).toBe('left');
    for (const scroll of ['edge', 'line', 'constant'] as const) {
      persistLyricsTickerScroll(scroll);
      expect(loadStoredLyricsTickerScroll()).toBe(scroll);
    }
  });

  it('treats garbage stored values as the defaults', () => {
    localStorage.setItem(ANCHOR_STORAGE_KEY, 'right');
    localStorage.setItem(SCROLL_STORAGE_KEY, 'bounce');
    expect(loadStoredLyricsTickerAnchor()).toBe('center');
    expect(loadStoredLyricsTickerScroll()).toBe('constant');
  });
});
