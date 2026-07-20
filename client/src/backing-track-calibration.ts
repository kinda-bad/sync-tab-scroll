import { TICKS_PER_QUARTER_NOTE } from './tempo-lookup';

/**
 * Per-playback calibration of a backing-track participant's position against
 * the session's reference (host) clock — T004, derived from the T004a
 * root-cause measurements in
 * `.project/plans/research-recording-mode-drift-2026-07-19-b7c2.md`.
 *
 * WHY THIS EXISTS
 *
 * A `PlayerMode.EnabledBackingTrack` instance reports the position of audio
 * the browser has actually emitted: its reported position tracks the
 * underlying `HTMLAudioElement.currentTime` to within ~5 ms, measured. A
 * synth instance reports the position of audio it has *scheduled*, which was
 * measured at ~275 ms ahead of what it emits. So the two clocks disagree by
 * a real skew, and a backing-track participant that is correctly in time
 * with a synth host will nonetheless *report* a position several hundred
 * ticks behind it.
 *
 * That skew alone is 528–657 ticks — an order of magnitude above
 * `DRIFT_THRESHOLD_TICKS` (50) — so without this calibration the drift
 * comparison trips on every single store update forever, producing a
 * corrective seek ~10×/second. That seek is itself audible in backing-track
 * mode (it lands on the audio element as a range request + re-buffer), so
 * the "correction" was strictly worse than the condition it corrected.
 *
 * WHY IT IS MEASURED RATHER THAN A CONSTANT
 *
 * The skew is stable to ±3 ms *within* one playback, but is re-rolled by
 * every `play()`: 275 ms → 342 ms was measured across a single pause/seek/
 * replay cycle, and it is invariant under `bufferTimeInMilliseconds`
 * (250→2000 ms all yield ~278 ms), so it is not the configurable output
 * buffer and there is no constant to name. It originates in the
 * asynchronous start of the audio element, whose decode/buffer delay
 * becomes a fixed offset for the whole of that playback.
 *
 * Hence: capture it once per playback, from the first comparison after
 * playback starts, and hold it until the next start. That keeps the 50-tick
 * threshold meaningful — after calibration the only residual is the genuine
 * `Δbpm × 16` ticks/s divergence between the recording's tempo and the
 * notated tempo, which is a real musical fact the threshold *should* catch.
 *
 * This is applied at the position-reporting boundary rather than inside
 * `correctDrift`, whose own arithmetic was measured to be exact (the host's
 * deviation from its own projection is 0 ticks). Compensating there would
 * corrupt a correct function; compensating at the boundary also generalises
 * to the other consumers of position (lyrics ticker, cursor, beat widget).
 */
export interface PositionCalibrator {
  readonly isCalibrated: boolean;
  /** Ticks to add to a local position to express it in the reference clock. */
  readonly skewTicks: number;
  /** Offers a (local, reference) pair as a calibration candidate; only the first of a playback is used. */
  observe(localTick: number, referenceTick: number): void;
  /** Local position -> reference clock, for comparison against a host-derived position. */
  toReference(localTick: number): number;
  /** Reference clock -> local position, so a correction computed in reference terms lands correctly. */
  fromReference(referenceTick: number): number;
  /** Discards the calibration. Call on every playback start/seek — the skew is re-rolled by each `play()`. */
  reset(): void;
}

/**
 * Largest gap still treated as start skew rather than a real seek.
 *
 * The measured skew tops out around 342 ms (≈657 ticks at 120 bpm); a real
 * host seek moves by whole bars (a single 4/4 bar at this resolution is 3840
 * ticks). One second of music sits comfortably between the two, so it
 * separates them without needing to know the score's tempo. Erring high
 * would silently swallow a short seek into the calibration and leave the
 * participant permanently displaced by that much music, which is why this is
 * a hard refusal rather than a clamp.
 */
export const MAX_CALIBRATION_SKEW_TICKS = TICKS_PER_QUARTER_NOTE * 2;

/**
 * How far the local backing track must have advanced before its skew is
 * considered settled and worth capturing.
 *
 * The skew is NOT present from the first instant of playback — it develops
 * over the audio element's asynchronous spin-up. Measured against a synth
 * host: the two clocks are within 8 ticks of each other ~250 ms after
 * `play()`, and the skew has already reached its steady ~530 ticks by
 * ~2.3 s, holding there for the rest of the playback (543 at 4.3 s, 530 at
 * 6.3 s). Calibrating during that ramp captures a fraction of the real value
 * — an early gate was measured capturing only ~195 of ~530 ticks, which left
 * the residual still far above `DRIFT_THRESHOLD_TICKS` and the seek storm
 * entirely unfixed.
 *
 * Four quarter notes (~2 s at 120 bpm) clears the ramp with margin while
 * still calibrating well inside the first phrase of any real song.
 */
export const CALIBRATION_SETTLE_TICKS = TICKS_PER_QUARTER_NOTE * 4;

/**
 * How many post-settle observations to pool before fixing the skew.
 *
 * A single sample is too noisy to calibrate from: each one carries up to a
 * full broadcast interval of projection staleness plus scheduler jitter, and
 * taking the first one alone was measured yielding wildly inconsistent skews
 * across otherwise identical runs (420, 227, −96, −5 ticks). The median of a
 * small pool is stable and rejects the occasional outlier sample outright,
 * which a mean would let through.
 */
export const CALIBRATION_SAMPLE_COUNT = 9;

export function createPositionCalibrator(): PositionCalibrator {
  let skew: number | null = null;
  let pending: number[] = [];

  return {
    get isCalibrated() {
      return skew !== null;
    },
    get skewTicks() {
      return skew ?? 0;
    },
    observe(localTick: number, referenceTick: number) {
      // Only the first observation of a playback calibrates. Later ones must
      // not, or genuine accumulating drift would be continuously absorbed as
      // "skew" and could never be detected or corrected.
      if (skew !== null) return;
      // Wait for the audio element's spin-up ramp to finish; see
      // CALIBRATION_SETTLE_TICKS.
      if (localTick < CALIBRATION_SETTLE_TICKS) return;
      const candidate = referenceTick - localTick;
      if (Math.abs(candidate) > MAX_CALIBRATION_SKEW_TICKS) return;
      pending.push(candidate);
      if (pending.length < CALIBRATION_SAMPLE_COUNT) return;
      const sorted = [...pending].sort((a, b) => a - b);
      skew = sorted[(sorted.length / 2) | 0];
    },
    toReference(localTick: number) {
      return localTick + (skew ?? 0);
    },
    fromReference(referenceTick: number) {
      return referenceTick - (skew ?? 0);
    },
    reset() {
      skew = null;
      pending = [];
    },
  };
}
