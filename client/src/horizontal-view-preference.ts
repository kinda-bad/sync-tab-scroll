/**
 * The horizontal view is a personal, this-device-only preference (ui.md
 * Preferences tab; feature horizontal-scroll-view): the tab shows as one
 * long staff scrolling right to left past a fixed playhead, with the lyrics
 * in their own band above it, instead of wrapped rows scrolling down the
 * page. Same localStorage pattern as metronome-preference.ts; the server
 * doesn't know about it. Default off (the paged view).
 */
import { writable } from 'svelte/store';

export const STORAGE_KEY = 'sync-tab-scroll:horizontal-view';

export function loadStoredHorizontalView(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

/**
 * Reactive mirror of the persisted preference: App.svelte rebuilds the
 * engine in the other layout when the Settings toggle flips mid-session.
 * Kept in sync by `persistHorizontalView` (the toggle's single write path).
 */
export const horizontalViewStore = writable(typeof localStorage !== 'undefined' ? loadStoredHorizontalView() : false);

export function persistHorizontalView(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  horizontalViewStore.set(enabled);
}
