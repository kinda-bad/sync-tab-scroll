/**
 * "Measure markers" (ui.md Preferences tab) is a personal, this-device-only
 * preference controlling whether the in-tab lyrics ticker shows
 * measure-boundary markers — same localStorage pattern as
 * metronome-preference.ts, default off.
 */
export const STORAGE_KEY = 'sync-tab-scroll:lyrics-measure-markers';

export function loadStoredMeasureMarkers(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

export function persistMeasureMarkers(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
}
