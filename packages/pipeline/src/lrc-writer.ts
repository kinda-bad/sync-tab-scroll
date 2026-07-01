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
 */
export function buildLrc(lines: string[], lyricLineBreaks: number[], syllables: Syllable[], tickToMs: (tick: number) => number): string {
  const out: string[] = [];
  let cursor = 0;

  for (let i = 0; i < lines.length; i++) {
    const count = lyricLineBreaks[i] ?? 0;
    const lineSyllables = syllables.slice(cursor, cursor + count);
    cursor += count;
    if (lineSyllables.length === 0) continue;

    const startMs = tickToMs(lineSyllables[0].tickPosition);
    const endMs = tickToMs(lineSyllables[lineSyllables.length - 1].tickPosition);

    out.push(`[${formatTimestamp(startMs)}]${lines[i]}`);
    out.push(`[${formatTimestamp(endMs)}]`);
  }

  return out.join('\n') + '\n';
}

/** Builds .lrc content directly from an lrclib-sourced synced-lyrics blob (fallback path — no GP timing available). */
export function passthroughLrc(syncedLyrics: string): string {
  return syncedLyrics.endsWith('\n') ? syncedLyrics : syncedLyrics + '\n';
}
