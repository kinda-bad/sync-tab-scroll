import { describe, it, expect } from 'vitest';
import { createPositionCalibrator, CALIBRATION_SAMPLE_COUNT } from './backing-track-calibration';

/** Feeds enough matching observations to complete one calibration. */
function calibrateTo(cal: ReturnType<typeof createPositionCalibrator>, localTick: number, referenceTick: number) {
  for (let i = 0; i < CALIBRATION_SAMPLE_COUNT; i++) cal.observe(localTick, referenceTick);
}

/**
 * T004 (tasks-sync-tabs-to-real-audio-cb85.md). The mechanism this covers is
 * derived from the T004a root-cause measurements recorded in
 * `.project/plans/research-recording-mode-drift-2026-07-19-b7c2.md`:
 *
 * A backing-track instance's reported position is faithful to the real audio
 * it emits (it tracks `HTMLAudioElement.currentTime` to ~5 ms), while a synth
 * instance reports ~275 ms AHEAD of the audio it emits. So the two clocks
 * disagree by a skew that is re-rolled on every `play()` (275 ms → 342 ms
 * across a seek was measured) but is stable to ±3 ms *within* one playback.
 *
 * Because the skew is re-rolled per start, no compensation constant can
 * exist — it has to be measured once per playback and applied thereafter.
 */
describe('createPositionCalibrator', () => {
  it('passes positions through unchanged before it has been calibrated', () => {
    const cal = createPositionCalibrator();
    expect(cal.isCalibrated).toBe(false);
    expect(cal.toReference(1000)).toBe(1000);
    expect(cal.fromReference(1000)).toBe(1000);
  });

  it('captures the skew from the first observation of a playback', () => {
    const cal = createPositionCalibrator();
    // Local backing-track clock reads 4400 while the reference (host) clock
    // says 5000 — a 600-tick skew, the ~300 ms magnitude actually measured.
    calibrateTo(cal, 4400, 5000);
    expect(cal.isCalibrated).toBe(true);
    expect(cal.skewTicks).toBe(600);
  });

  it('maps a local position into the reference clock, so drift reads ~0 when in sync', () => {
    const cal = createPositionCalibrator();
    calibrateTo(cal, 4400, 5000);
    // Same relationship later in the playback => no apparent drift.
    expect(cal.toReference(8400)).toBe(9000);
  });

  it('inverts the mapping so a correction computed in reference terms lands correctly locally', () => {
    const cal = createPositionCalibrator();
    calibrateTo(cal, 4400, 5000);
    expect(cal.fromReference(9000)).toBe(8400);
    expect(cal.fromReference(cal.toReference(1234))).toBeCloseTo(1234);
  });

  it('does NOT re-calibrate on later observations within the same playback', () => {
    const cal = createPositionCalibrator();
    calibrateTo(cal, 4400, 5000);
    // A genuine divergence later on must NOT be absorbed as calibration —
    // otherwise real drift would silently redefine "in sync" and the
    // Δbpm × 16 accumulation could never be detected.
    calibrateTo(cal, 8000, 9000);
    expect(cal.skewTicks).toBe(600);
  });

  it('re-calibrates after reset(), because the skew is re-rolled by each play()', () => {
    const cal = createPositionCalibrator();
    calibrateTo(cal, 4400, 5000);
    cal.reset();
    expect(cal.isCalibrated).toBe(false);
    calibrateTo(cal, 20000, 20700);
    expect(cal.skewTicks).toBe(700);
  });

  it('ignores observations during the audio element spin-up ramp', () => {
    const cal = createPositionCalibrator();
    // The skew is not yet developed this early — capturing here would lock in
    // a fraction of the real value and leave the drift storm unfixed.
    for (let i = 0; i < CALIBRATION_SAMPLE_COUNT; i++) cal.observe(500, 700);
    expect(cal.isCalibrated).toBe(false);
    calibrateTo(cal, 4400, 5000);
    expect(cal.skewTicks).toBe(600);
  });

  it('takes the median of its sample pool, rejecting an outlier observation', () => {
    const cal = createPositionCalibrator();
    for (let i = 0; i < CALIBRATION_SAMPLE_COUNT - 1; i++) cal.observe(4400, 5000);
    expect(cal.isCalibrated).toBe(false);
    cal.observe(4400, 5900); // outlier: 1500-tick candidate
    expect(cal.skewTicks).toBe(600);
  });

  it('refuses to calibrate on an implausibly large gap, which is a seek rather than a skew', () => {
    const cal = createPositionCalibrator();
    // A host seek is thousands of ticks. Absorbing one as "skew" would make
    // the participant permanently offset by a whole passage of music.
    for (let i = 0; i < CALIBRATION_SAMPLE_COUNT; i++) cal.observe(5000, 45000);
    expect(cal.isCalibrated).toBe(false);
    expect(cal.toReference(5000)).toBe(5000);
  });
});
