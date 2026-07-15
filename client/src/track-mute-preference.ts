/**
 * A "mute this part" preference is personal and client-local, like the
 * metronome (ui.md Preferences tab) — every participant's own alphaTab
 * instance already plays the full multi-track mix regardless of which part
 * they're rendering/playing (research-part-mute-toggle-full-mix-vetting),
 * so muting a track only silences it for the muter, never broadcast to the
 * session. Same localStorage load/persist pair shape as
 * metronome-preference.ts, but keyed per (songId, trackIndex) rather than
 * one global flag — a mute choice for "Bass" on one song must not carry
 * over to a different song's differently-indexed "Bass" track.
 */
export function storageKey(songId: string, trackIndex: number): string {
  return `sync-tab-scroll:mute:${songId}:${trackIndex}`;
}

export function loadStoredTrackMute(songId: string, trackIndex: number): boolean {
  return localStorage.getItem(storageKey(songId, trackIndex)) === 'on';
}

export function persistTrackMute(songId: string, trackIndex: number, muted: boolean): void {
  localStorage.setItem(storageKey(songId, trackIndex), muted ? 'on' : 'off');
}
