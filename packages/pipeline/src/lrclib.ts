export interface LrclibResult {
  syncedLyrics: string | null;
}

/**
 * Queries lrclib.net for synced lyrics. Used in two distinct, narrower roles
 * (pipeline.md): as a line-break reference when GP has lyrics but no marked
 * line boundaries (GP timing is still used for everything), and as a full
 * fallback lyrics source when GP has no embedded lyrics at all.
 */
export async function searchLrclib(trackName: string, artistName: string): Promise<LrclibResult | null> {
  const url = new URL('https://lrclib.net/api/search');
  url.searchParams.set('track_name', trackName);
  url.searchParams.set('artist_name', artistName);

  const response = await fetch(url, { headers: { 'User-Agent': 'sync-tab-scroll-pipeline' } });
  if (!response.ok) return null;

  const results = (await response.json()) as Array<{ syncedLyrics: string | null }>;
  const withSync = results.find((r) => r.syncedLyrics);
  return withSync ? { syncedLyrics: withSync.syncedLyrics } : null;
}

/** Extracts just the printed lines (no timestamps) from an lrclib synced-lyrics blob, for line-break reference only. */
export function parseLrclibLines(syncedLyrics: string): string[] {
  return syncedLyrics
    .split('\n')
    .map((l) => l.replace(/^\[\d{2}:\d{2}\.\d{2,3}\]/, '').trim())
    .filter((l) => l.length > 0);
}

export interface TimedLrclibLine {
  text: string;
  /** The line's lrclib `[mm:ss.xx]` timestamp, converted to milliseconds. */
  tickMs: number;
}

/**
 * Like `parseLrclibLines`, but keeps each line's own `[mm:ss.xx]` timestamp
 * (converted to milliseconds) instead of discarding it — feeds
 * `alignLinesByTimestamp`'s tick-proximity line-boundary placement
 * (pipeline.md), rather than word-count-proportional estimation.
 */
export function parseLrclibLinesWithTimestamps(syncedLyrics: string): TimedLrclibLine[] {
  const lines: TimedLrclibLine[] = [];
  for (const raw of syncedLyrics.split('\n')) {
    const match = raw.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/);
    if (!match) continue;
    const text = match[4].trim();
    if (text.length === 0) continue;
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const fraction = match[3].padEnd(3, '0');
    const millis = Number(fraction);
    const tickMs = minutes * 60000 + seconds * 1000 + millis;
    lines.push({ text, tickMs });
  }
  return lines;
}
