import type * as at from '@coderline/alphatab';

export interface GapTimingResult {
  /** Whether this gap's real-time duration exceeds one local measure (ui.md Gap timing indicator). */
  qualifies: boolean;
  /** The local measure length, in ms, of the masterBar nearest `endMs`. */
  measureDurationMs: number;
  /** The 4 beat timestamps (ms, ascending) immediately preceding `endMs`, at the local beat duration. Empty when `qualifies` is false. */
  beatTimestampsMs: number[];
}

// T001 stub (tasks-lyrics-gap-timing-indicator-6541.md): compiles so the
// repo's pre-commit typecheck hook passes, but is not yet implemented —
// T001's unit test asserts real behavior against this and is expected to
// fail (red) until T002 replaces this body.
export function computeGapTiming(_score: at.model.Score, _startMs: number, _endMs: number): GapTimingResult {
  throw new Error('computeGapTiming: not yet implemented (T002)');
}
