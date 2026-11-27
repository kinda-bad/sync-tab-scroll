/**
 * How the in-tab lyrics ticker moves (ui.md Settings › Lyrics; feature
 * lyrics-ticker-scroll-modes) — two personal, this-device-only preferences,
 * same localStorage pattern as lyrics-ticker-position-preference.ts:
 *
 * - **Anchor**: where the highlighted syllable sits in the strip. `center`
 *   (today's behavior) or `left`, which shows more of what's coming.
 * - **Scroll**: `constant` (today: the strip moves on every syllable),
 *   `edge` (the strip holds still and pages only when the highlight nears
 *   an edge) or `line` (one lyric line at a time, switching when the next
 *   line starts).
 */
export type LyricsTickerAnchor = 'center' | 'left';
export type LyricsTickerScroll = 'constant' | 'edge' | 'line';

const ANCHORS: LyricsTickerAnchor[] = ['center', 'left'];
const SCROLLS: LyricsTickerScroll[] = ['constant', 'edge', 'line'];

export const ANCHOR_STORAGE_KEY = 'sync-tab-scroll:lyrics-ticker-anchor';
export const SCROLL_STORAGE_KEY = 'sync-tab-scroll:lyrics-ticker-scroll';

export function loadStoredLyricsTickerAnchor(): LyricsTickerAnchor {
  const stored = localStorage.getItem(ANCHOR_STORAGE_KEY);
  return (ANCHORS as string[]).includes(stored ?? '') ? (stored as LyricsTickerAnchor) : 'center';
}

export function persistLyricsTickerAnchor(anchor: LyricsTickerAnchor): void {
  localStorage.setItem(ANCHOR_STORAGE_KEY, anchor);
}

export function loadStoredLyricsTickerScroll(): LyricsTickerScroll {
  const stored = localStorage.getItem(SCROLL_STORAGE_KEY);
  return (SCROLLS as string[]).includes(stored ?? '') ? (stored as LyricsTickerScroll) : 'constant';
}

export function persistLyricsTickerScroll(scroll: LyricsTickerScroll): void {
  localStorage.setItem(SCROLL_STORAGE_KEY, scroll);
}
