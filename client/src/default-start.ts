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
  /** `playbackState.tickPosition` as the server last broadcast it. */
  serverTick: number;
  isHost: boolean;
  /** `defaultStartTick(...)` for this song, or null when it has none. */
  startTick: number | null;
}

/**
 * Decides when the host's client seeds `PlaybackState.tickPosition` with the
 * song's default start (per-song-default-start-point). One seed per song per
 * stopped stretch: the arm is consumed by every client the first time it
 * sees the song stopped (so a participant who later becomes host doesn't
 * re-seed over the old host's choice) and re-armed when the session leaves
 * `stopped` — so song select seeds, every Stop seeds again, and a host click
 * (even back to bar 1) sticks. Only a position still at the top is seeded, so
 * a host reload mid-song doesn't override it. Returns the tick to seek to, or
 * null. One seeder lives for the page (playback-engine.ts) so an engine
 * rebuild (part or audio-source switch) doesn't re-seed either.
 */
export function createDefaultStartSeeder(): (input: DefaultStartSeedInput) => number | null {
  let consumedFor: string | null = null;
  return ({ status, songId, serverTick, isHost, startTick }) => {
    if (status !== 'stopped') {
      consumedFor = null;
      return null;
    }
    if (consumedFor === songId) return null;
    consumedFor = songId;
    if (!isHost || serverTick !== 0 || startTick === null || startTick === 0) return null;
    return startTick;
  };
}
