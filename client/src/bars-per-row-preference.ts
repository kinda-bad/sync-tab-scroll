/**
 * Personal, this-device-only bars-per-row preference (ui.md Preferences
 * tab) — mirrors metronome-preference.ts's localStorage pattern. `null`
 * means "Auto" (alphaTab's default auto-wrap). Shadowed by
 * `Session.hostBarsPerRow` at renderer construction when the host has
 * pinned a layout (host-mandated-bars-per-row-layout).
 */
export const STORAGE_KEY = 'sync-tab-scroll:bars-per-row';

export function loadStoredBarsPerRow(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function persistBarsPerRow(barsPerRow: number | null): void {
  if (barsPerRow === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, String(barsPerRow));
}
