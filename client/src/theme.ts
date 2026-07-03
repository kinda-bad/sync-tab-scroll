import type { Theme } from './tab-renderer';

export type StoredTheme = Theme;

export const STORAGE_KEY = 'sync-tab-scroll:theme';

export function loadStoredTheme(): StoredTheme | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== 'dark' && raw !== 'light') return undefined;
  return raw;
}

export function persistTheme(theme: StoredTheme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Sets the document-level CSS palette (styles/tokens.css reads
 * `[data-theme='...']`). Callers that also want the tab-notation colors
 * to switch together (per brand.md's "toggling theme anywhere in the app
 * switches both at once") should prefer this module's own call site in
 * `main.ts`/`SettingsModal.svelte`, which pairs this with
 * `playback-engine.ts`'s `setEngineTheme()` — see T008.
 */
export function applyTheme(theme: StoredTheme): void {
  document.documentElement.dataset.theme = theme;
}
