/**
 * The lyrics ticker position is a personal, this-device-only preference
 * (ui.md Preferences tab; feature lyrics-ticker-position-preference) — the
 * in-tab ticker fixes to the top or bottom of the viewport. Same
 * localStorage pattern as lyrics-ticker-font-size-preference.ts, since it
 * affects only this participant's own overlay rendering and the server
 * doesn't know about it. Default bottom (today's behavior).
 */
export type LyricsTickerPosition = 'top' | 'bottom';

const POSITIONS: LyricsTickerPosition[] = ['top', 'bottom'];

export const STORAGE_KEY = 'sync-tab-scroll:lyrics-ticker-position';

export function loadStoredLyricsTickerPosition(): LyricsTickerPosition {
  const stored = localStorage.getItem(STORAGE_KEY);
  return (POSITIONS as string[]).includes(stored ?? '') ? (stored as LyricsTickerPosition) : 'bottom';
}

export function persistLyricsTickerPosition(position: LyricsTickerPosition): void {
  localStorage.setItem(STORAGE_KEY, position);
}
