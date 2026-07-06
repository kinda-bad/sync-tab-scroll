import type * as at from '@coderline/alphatab';

export interface GapTimingResult {
  /** Whether this gap's real-time duration exceeds one local measure (ui.md Gap timing indicator). */
  qualifies: boolean;
  /** The local measure length, in ms, of the masterBar nearest `endMs`. */
  measureDurationMs: number;
  /** The 4 beat timestamps (ms, ascending) immediately preceding `endMs`, at the local beat duration. Empty when `qualifies` is false. */
  beatTimestampsMs: number[];
}

/**
 * alphaTab's fixed MIDI tick resolution (`MidiUtils.QuarterTime` internally
 * — not part of the public `@coderline/alphatab` API surface, so this
 * module hardcodes the same stable constant rather than importing it).
 * `MasterBar.calculateDuration()` returns a bar's length in these ticks;
 * converting to real time at a given tempo is standard MIDI tick math:
 * ms = ticks * (60000 / (bpm * ticksPerQuarterNote)).
 */
const TICKS_PER_QUARTER_NOTE = 960;

function ticksToMs(ticks: number, bpm: number): number {
  return (ticks * 60000) / (bpm * TICKS_PER_QUARTER_NOTE);
}

/**
 * Given the headless alphaTab instance's own loaded score and a `.lrc` gap
 * window `[startMs, endMs]` (ui.md "Gap timing indicator"), determines
 * whether the gap exceeds one measure's local real-time length and, if so,
 * the 4 beat timestamps immediately preceding `endMs`.
 *
 * Walks `score.masterBars` from the start, accumulating each bar's real
 * duration using *that bar's own* tempo (from its `tempoAutomations`,
 * carried forward from the previous bar/song-initial tempo when a bar has
 * none) — deliberately not `CatalogSong.bpm` (datamodel.md: display-only,
 * not for tick-to-time math). This walk is a genuine, tempo-aware
 * tick-to-time mapping built from the score's own data, standing in for
 * `AlphaTabApi`'s internal (non-public) tick/time conversion.
 *
 * Known simplification (plan-lyrics-gap-timing-indicator-2026-07-06.md,
 * Open Questions): a tempo automation is treated as applying for its whole
 * masterBar, not from its exact mid-bar tick offset — acceptable for this
 * catalog's real songs, revisit only if a specific song's rapid mid-bar
 * tempo automation makes the countdown visibly wrong.
 */
export function computeGapTiming(score: at.model.Score, startMs: number, endMs: number): GapTimingResult {
  let cumulativeMs = 0;
  let tempo = score.tempo;

  let targetBarDurationMs = 0;
  let targetTimeSignatureNumerator = 4;
  let found = false;

  for (const masterBar of score.masterBars) {
    const automations = masterBar.tempoAutomations;
    if (automations && automations.length > 0) {
      tempo = automations[0].value;
    }

    const durationTicks = masterBar.calculateDuration();
    const durationMs = ticksToMs(durationTicks, tempo);
    const barEndMs = cumulativeMs + durationMs;

    // "Nearest masterBar to endMs": the bar containing endMs, or (once
    // endMs is past the whole score, e.g. a trailing/leading edge case) the
    // last bar seen so far.
    if (!found && (endMs < barEndMs || masterBar === score.masterBars[score.masterBars.length - 1])) {
      targetBarDurationMs = durationMs;
      targetTimeSignatureNumerator = masterBar.timeSignatureNumerator;
      found = true;
    }

    cumulativeMs = barEndMs;
    if (found) break;
  }

  const gapDurationMs = endMs - startMs;
  const qualifies = found && gapDurationMs > targetBarDurationMs;

  if (!qualifies) {
    return { qualifies: false, measureDurationMs: targetBarDurationMs, beatTimestampsMs: [] };
  }

  const beatDurationMs = targetBarDurationMs / targetTimeSignatureNumerator;
  const beatTimestampsMs = [4, 3, 2, 1].map((beatsBeforeEnd) => endMs - beatsBeforeEnd * beatDurationMs);

  return { qualifies: true, measureDurationMs: targetBarDurationMs, beatTimestampsMs };
}
