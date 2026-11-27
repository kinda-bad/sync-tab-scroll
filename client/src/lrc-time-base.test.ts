import { describe, expect, it } from 'vitest';
import * as at from '@coderline/alphatab';
import type { FlatSyncPoint } from '@sync-tab-scroll/shared';
import { lrcToTabTime, recordingMsToTabMs } from './lrc-time-base';

/** Four 4/4 bars at 120bpm: each bar is 2000ms of tab (synth) time, 8000ms in all. */
function fourBarScore(): at.model.Score {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(`\\tempo 120\n.\n\\track "V"\n\\ts 4 4 0.4.1 | 0.4.1 | 0.4.1 | 0.4.1`, settings);
  return importer.readScore();
}

// The recording starts 1s in and plays bars 1–2 at half speed (8s for 4s of tab).
const SYNC_POINTS: FlatSyncPoint[] = [
  { barIndex: 0, barOccurence: 0, barPosition: 0, millisecondOffset: 1000 },
  { barIndex: 2, barOccurence: 0, barPosition: 0, millisecondOffset: 9000 },
];

const lrclibSong = { lyricsTrackIndex: null, syncPoints: SYNC_POINTS };

describe('recordingMsToTabMs (mirrors alphaTab mainTimePositionFromBackingTrack)', () => {
  const points = [
    { syncTime: 1000, synthTime: 0 },
    { syncTime: 9000, synthTime: 4000 },
    { syncTime: 17000, synthTime: 8000 },
  ];

  it('interpolates linearly inside a segment', () => {
    expect(recordingMsToTabMs(points, 1000)).toBe(0);
    expect(recordingMsToTabMs(points, 5000)).toBe(2000);
    expect(recordingMsToTabMs(points, 9000)).toBe(4000);
    expect(recordingMsToTabMs(points, 13000)).toBe(6000);
  });

  it('extrapolates the first segment before the first point, and passes negative times through', () => {
    expect(recordingMsToTabMs(points, 500)).toBe(-250);
    expect(recordingMsToTabMs(points, -10)).toBe(-10);
  });

  it('holds the last point (the song end) after it', () => {
    expect(recordingMsToTabMs(points, 20000)).toBe(8000);
  });

  it('is the identity with no points', () => {
    expect(recordingMsToTabMs([], 1234)).toBe(1234);
  });
});

describe('lrcToTabTime', () => {
  it("converts an lrclib .lrc's recording times to tab time through the song's sync points", () => {
    const toTab = lrcToTabTime(lrclibSong, fourBarScore());
    expect(toTab(1000)).toBeCloseTo(0, 3);
    expect(toTab(5000)).toBeCloseTo(2000, 3);
    expect(toTab(9000)).toBeCloseTo(4000, 3);
    // Past the last flat point alphaTab adds a song-end point at the previous
    // segment's rate (half speed): bars 3–4 end at recording 17000ms.
    expect(toTab(13000)).toBeCloseTo(6000, 3);
    expect(toTab(17000)).toBeCloseTo(8000, 3);
  });

  it('leaves a tab-sourced .lrc alone (its times are generated from tab ticks)', () => {
    const toTab = lrcToTabTime({ lyricsTrackIndex: 0, syncPoints: SYNC_POINTS }, fourBarScore());
    expect(toTab(5000)).toBe(5000);
  });

  it('leaves an lrclib .lrc alone when the song has no sync points (nothing to anchor it)', () => {
    expect(lrcToTabTime({ lyricsTrackIndex: null, syncPoints: null }, fourBarScore())(5000)).toBe(5000);
    expect(lrcToTabTime({ lyricsTrackIndex: null, syncPoints: [] }, fourBarScore())(5000)).toBe(5000);
  });

  it("restores the score's own sync points (none in synth mode, the applied ones in recording mode)", () => {
    const synthScore = fourBarScore();
    lrcToTabTime(lrclibSong, synthScore);
    expect(synthScore.exportFlatSyncPoints()).toEqual([]);

    const recordingScore = fourBarScore();
    const own: FlatSyncPoint[] = [{ barIndex: 1, barOccurence: 0, barPosition: 0, millisecondOffset: 4321 }];
    recordingScore.applyFlatSyncPoints(own);
    lrcToTabTime(lrclibSong, recordingScore);
    expect(recordingScore.exportFlatSyncPoints()).toEqual(own);
  });
});
