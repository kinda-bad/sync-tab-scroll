import * as at from '@coderline/alphatab';
import type { CatalogSong } from '@sync-tab-scroll/shared';

/** The two fields of alphaTab's `BackingTrackSyncPoint` the recording→tab conversion reads. */
export type RecordingTabAnchor = Pick<at.synth.BackingTrackSyncPoint, 'syncTime' | 'synthTime'>;

/**
 * Recording time (ms into `recording.mp3`) to tab time (ms on alphaTab's own
 * synth timeline, what `playerPositionChanged`'s `currentTime` reports in
 * both playback modes). Mirrors alphaTab's
 * `MidiFileSequencer.mainTimePositionFromBackingTrack` (the conversion the
 * backing-track player itself runs on every audio time update):
 * - negative times, or no anchors: unchanged;
 * - linear between two anchors;
 * - before the first anchor: the first segment extrapolated backward;
 * - after the last anchor: held at the last anchor's tab time. alphaTab's
 *   own tail maps the rest of the audio file onto the rest of the song, and
 *   `generateSyncPoints` always ends on the song end, so both stay at the
 *   song end (alphaTab needs the audio file's length for that last segment;
 *   this doesn't).
 * `anchors` must be sorted by `syncTime` (alphaTab's output is).
 */
export function recordingMsToTabMs(anchors: RecordingTabAnchor[], recordingMs: number): number {
  if (recordingMs < 0 || anchors.length === 0) return recordingMs;
  let index = 0;
  while (index + 1 < anchors.length && anchors[index + 1].syncTime <= recordingMs) index++;
  const current = anchors[index];
  const next = anchors[index + 1];
  if (!next) return current.synthTime;
  const ratio = (recordingMs - current.syncTime) / (next.syncTime - current.syncTime);
  return current.synthTime + (next.synthTime - current.synthTime) * ratio;
}

/**
 * Where a song's `.lrc` times come from (pipeline.md extract-lyrics,
 * datamodel.md `CatalogSong.lyricsLrc`): generated from the tab's own ticks
 * when the song has a lyric track (`lyricsTrackIndex` set), so already tab
 * time; passed through from lrclib otherwise, so studio-recording time.
 */
export function lrcIsRecordingTimed(song: Pick<CatalogSong, 'lyricsTrackIndex'>): boolean {
  return song.lyricsTrackIndex === null;
}

/**
 * Returns the converter from a song's `.lrc` times to tab time
 * (infrastructure.md Lyrics time base). Identity for a tab-timed `.lrc`, and
 * for a recording-timed one with no `syncPoints` to anchor it (a song with
 * neither a lyric track nor a recording: nothing relates its lrclib times to
 * the tab, so they are used as they are).
 *
 * The anchors are alphaTab's own: `MidiFileGenerator.generateSyncPoints`,
 * the same list the backing-track player is fed, so repeats, tempo changes
 * and the song-end point are handled exactly as playback handles them. The
 * flat points are applied to the score only for that call and the score's
 * previous points put back, so a synth-mode score is left without sync
 * points and a recording-mode one keeps its own.
 */
export function lrcToTabTime(
  song: Pick<CatalogSong, 'lyricsTrackIndex' | 'syncPoints'>,
  score: at.model.Score,
): (lrcMs: number) => number {
  if (!lrcIsRecordingTimed(song) || !song.syncPoints || song.syncPoints.length === 0) return (lrcMs) => lrcMs;

  const previous = score.exportFlatSyncPoints();
  score.applyFlatSyncPoints(song.syncPoints);
  const anchors = at.midi.MidiFileGenerator.generateSyncPoints(score).map(({ syncTime, synthTime }) => ({ syncTime, synthTime }));
  score.applyFlatSyncPoints(previous);
  anchors.sort((a, b) => a.syncTime - b.syncTime);

  return (lrcMs) => recordingMsToTabMs(anchors, lrcMs);
}
