export interface LrcLine {
  timeMs: number;
  text: string;
}

/**
 * Parses .lrc content into timestamped lines, including pipeline.md's
 * blank-content "gap" entries (encoding a line's end timestamp) which are
 * kept as empty-text lines — the primary lyrics view (ui.md) uses a gap's
 * start time as the *previous* real line's end time.
 */
export function parseLrc(content: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of content.split('\n')) {
    const match = raw.match(/^\[(\d{2}):(\d{2}\.\d{2,3})\](.*)$/);
    if (!match) continue;
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const timeMs = (minutes * 60 + seconds) * 1000;
    lines.push({ timeMs, text: match[3].trim() });
  }
  return lines;
}
