import type { Theme } from './tab-renderer';
import { setEngineTheme } from './playback-engine';

export type StoredTheme = Theme;

export const STORAGE_KEY = 'sync-tab-scroll:theme';

export function loadStoredTheme(): StoredTheme | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== 'dark' && raw !== 'light' && raw !== 'cyberpunk-dark' && raw !== 'cyberpunk-light') return undefined;
  return raw;
}

export function persistTheme(theme: StoredTheme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Sets the document-level CSS palette (styles/tokens.css reads
 * `[data-theme='...']`) and the tab-notation colors together, per
 * brand.md's "toggling theme anywhere in the app switches both at once."
 * `setEngineTheme()` is a no-op if no playback engine is active yet (e.g.
 * called from `main.ts` before entering the Lobby/Playback views).
 */
export function applyTheme(theme: StoredTheme): void {
  document.documentElement.dataset.theme = theme;
  setEngineTheme(theme);
}
