/**
 * The lyrics ticker font size is a personal, this-device-only preference
 * (ui.md Preferences tab) — same localStorage pattern as
 * metronome-preference.ts, since it affects only this participant's own
 * in-tab lyrics overlay rendering and the server doesn't know about it.
 */
export type LyricsTickerFontSize = 'small' | 'medium' | 'large' | 'huge';

const SIZES: LyricsTickerFontSize[] = ['small', 'medium', 'large', 'huge'];

export const STORAGE_KEY = 'sync-tab-scroll:lyrics-ticker-font-size';

export function loadStoredLyricsTickerFontSize(): LyricsTickerFontSize {
  const stored = localStorage.getItem(STORAGE_KEY);
  return (SIZES as string[]).includes(stored ?? '') ? (stored as LyricsTickerFontSize) : 'medium';
}

export function persistLyricsTickerFontSize(size: LyricsTickerFontSize): void {
  localStorage.setItem(STORAGE_KEY, size);
}
