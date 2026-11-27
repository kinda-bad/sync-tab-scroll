import type * as at from '@coderline/alphatab';
import type { PlaybackState } from '@sync-tab-scroll/shared';

/**
 * Maps a song's 1-based `defaultStartBar` (datamodel.md CatalogSong) to the
 * playback tick where that bar is first played. Uses alphaTab's own
 * `MidiTickLookup.getMasterBarStart` (Principle V) — playback ticks, so a bar
 * after a repeat lands where the player actually reaches it — and falls back
 * to `masterBar.start` (score ticks) if the lookup isn't built yet. Returns
 * null when there's no bar, no score, or the bar is past the end of the score.
 */
export function defaultStartTick(
  score: at.model.Score | null | undefined,
  tickCache: at.midi.MidiTickLookup | null | undefined,
  bar: number | undefined,
): number | null {
  if (!score || bar === undefined) return null;
  const masterBar = score.masterBars[bar - 1];
  if (!masterBar) return null;
  return tickCache ? tickCache.getMasterBarStart(masterBar) : masterBar.start;
}

export interface DefaultStartSeedInput {
  status: PlaybackState['status'];
  /** The song the engine has loaded. */
  songId: string;
  /** `Session.startMarkerBar` — the host-controlled start marker, or null once cleared. */
  markerBar: number | null;
  /** `playbackState.tickPosition` as the server last broadcast it. */
  serverTick: number;
  isHost: boolean;
  /** `defaultStartTick(...)` for the marker bar, or null when there's no marker (or it's past the end of the score). */
  startTick: number | null;
}

/**
 * Decides when the host's client moves `PlaybackState.tickPosition` to the
 * session's start marker (per-song-default-start-point). The server holds the
 * marker as a bar and can't map it to a tick, so after song select, after
 * every Stop and whenever the marker changes, the host seeks there. One seek
 * per (song, marker) per stopped stretch: the arm is consumed by every client
 * the first time it sees that combination stopped (so a participant who
 * later becomes host doesn't re-seek over the old host's choice) and re-armed
 * when the session leaves `stopped`. A host click while stopped (even back to
 * bar 1) therefore sticks until the next Stop, and a cleared marker never
 * seeks, so Stop stays on bar 1. Returns the tick to seek to, or null. One
 * seeder lives for the page (playback-engine.ts) so an engine rebuild (part
 * or audio-source switch) doesn't re-seek either.
 */
export function createDefaultStartSeeder(): (input: DefaultStartSeedInput) => number | null {
  let consumedFor: string | null = null;
  return ({ status, songId, markerBar, serverTick, isHost, startTick }) => {
    if (status !== 'stopped') {
      consumedFor = null;
      return null;
    }
    const key = `${songId}|${markerBar}`;
    if (consumedFor === key) return null;
    consumedFor = key;
    if (!isHost || startTick === null || startTick === serverTick) return null;
    return startTick;
  };
}
