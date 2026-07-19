/**
 * The metronome is a personal, this-device-only preference (ui.md
 * Preferences tab) — each participant's own alphaTab instance generates
 * its metronome clicks locally, so no other participant is affected and
 * the server doesn't know about it. Reversal of the original
 * host-controlled Session.metronomeEnabled design, user-confirmed
 * 2026-07-04 (plan-worktree-ui-improvements). Same localStorage pattern
 * as theme.ts; default off matches the old session-level default.
 */
import { writable } from 'svelte/store';

export const STORAGE_KEY = 'sync-tab-scroll:metronome';

export function loadStoredMetronome(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

/**
 * Reactive mirror of the persisted preference (count-in-metronome-beat-widget,
 * ui.md): the Bar's beat widget gates its playback mode on this personal
 * preference, and needs to react when the user flips the Settings toggle
 * mid-session — a plain localStorage read can't notify. Kept in sync by
 * `persistMetronome` (the toggle's single write path).
 */
export const metronomeStore = writable(typeof localStorage !== 'undefined' ? loadStoredMetronome() : false);

export function persistMetronome(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  metronomeStore.set(enabled);
}
