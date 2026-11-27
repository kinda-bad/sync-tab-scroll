import { unrollSyllables, type PlacedSyllable, type PlaybackOrder } from '@sync-tab-scroll/shared';
import type { Syllable } from './gp-parser.js';

function formatTimestamp(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/**
 * Builds .lrc content from GP-derived lines and syllable timing. Each line's
 * end timestamp is encoded as an extra blank-content "gap" entry at the time
 * of that line's last syllable — GP syllable timing is why .lrc is generated
 * from GP rather than taken from lrclib directly (pipeline.md): it lets each
 * line carry an accurate *end* timestamp, not just a start.
 *
 * `syllables` are written-order (notation-tick) syllables; `lyricLineBreaks`
 * groups them into `lines`. They are moved onto the playback timeline with
 * the shared `unrollSyllables` (pipeline.md Repeats) before timing, so a line
 * after a repeat sign lands where it is actually played, and a line inside a
 * repeated section is written once per pass. A line entry is one run of
 * consecutive placed syllables from the same line; a run also ends where
 * playback jumps back (a repeat entirely inside one line sings it twice).
 */
export function buildLrc(
  lines: string[],
  lyricLineBreaks: number[],
  syllables: Syllable[],
  playbackOrder: PlaybackOrder,
  tickToMs: (tick: number) => number,
): string {
  const lineOfSyllable: number[] = [];
  lyricLineBreaks.forEach((count, line) => {
    for (let i = 0; i < count; i++) lineOfSyllable.push(line);
  });

  const placed = unrollSyllables(syllables, playbackOrder.masterBarStarts, playbackOrder.plays);
  const out: string[] = [];
  let run: PlacedSyllable[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const line = lineOfSyllable[run[0].sourceIndex];
    out.push(`[${formatTimestamp(tickToMs(run[0].tickPosition))}]${lines[line]}`);
    out.push(`[${formatTimestamp(tickToMs(run[run.length - 1].tickPosition))}]`);
    run = [];
  };

  for (const syllable of placed) {
    const line = lineOfSyllable[syllable.sourceIndex];
    if (line === undefined) continue; // past the last line break: not part of any line
    const previous = run[run.length - 1];
    if (previous && (lineOfSyllable[previous.sourceIndex] !== line || syllable.sourceIndex <= previous.sourceIndex)) flush();
    run.push(syllable);
  }
  flush();

  return out.join('\n') + '\n';
}

/** Builds .lrc content directly from an lrclib-sourced synced-lyrics blob (fallback path — no GP timing available). */
export function passthroughLrc(syncedLyrics: string): string {
  return syncedLyrics.endsWith('\n') ? syncedLyrics : syncedLyrics + '\n';
}
