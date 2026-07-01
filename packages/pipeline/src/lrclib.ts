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
