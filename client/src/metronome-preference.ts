/**
 * The metronome is a personal, this-device-only preference (ui.md
 * Preferences tab) — each participant's own alphaTab instance generates
 * its metronome clicks locally, so no other participant is affected and
 * the server doesn't know about it. Reversal of the original
 * host-controlled Session.metronomeEnabled design, user-confirmed
 * 2026-07-04 (plan-worktree-ui-improvements). Same localStorage pattern
 * as theme.ts; default off matches the old session-level default.
 */
export const STORAGE_KEY = 'sync-tab-scroll:metronome';

export function loadStoredMetronome(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

export function persistMetronome(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
}
