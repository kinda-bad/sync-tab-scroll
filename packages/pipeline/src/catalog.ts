import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CatalogPartMeta {
  instrumentName: string;
  trackIndex: number;
}

export interface CatalogMeta {
  name: string;
  artist: string;
  parts: CatalogPartMeta[];
  /**
   * The GP track names as the pipeline read them, in track order. Lets a
   * re-run tell a hand-named part (kept) from a track that changed in the
   * `.gp` (regenerated). Not sent to clients.
   */
  trackNames: string[];
  lyricsTrackIndex: number | null;
  lyricsLineIndex: number | null;
  lyricLineBreaks: number[] | null;
  /** Raw track-level GP lyric line for GP-semantics re-dispatch (feedback F001). Omitted when the song has no track-level line. */
  lyricsRawLine?: string;
  /** The raw line's start-bar offset (GPIF <Offset>); omitted when 0. */
  lyricsRawLineStartBar?: number;
}

/**
 * Keys the pipeline regenerates from the `.gp` on every run. Every other key
 * in an existing `meta.json` (`syncPoints`, `defaultStartBar`, anything added
 * by hand) is kept as-is. `name`, `artist` and `parts` are derived but can be
 * hand-corrected, so `mergeMeta` treats them specially.
 */
const DERIVED_KEYS = [
  'name',
  'artist',
  'parts',
  'trackNames',
  'lyricsTrackIndex',
  'lyricsLineIndex',
  'lyricLineBreaks',
  'lyricsRawLine',
  'lyricsRawLineStartBar',
] as const;

export type MergedCatalogMeta = CatalogMeta & Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Merges a freshly generated meta over the song's existing `meta.json`
 * (pipeline.md "Re-running on an existing song"):
 * - non-derived keys from the existing file are kept;
 * - derived lyric keys come from the new run only (an optional one the new
 *   run omits is dropped, not carried over);
 * - an existing non-empty `name` / `artist` is kept (the filename they're
 *   generated from can't hold every character, e.g. `?`);
 * - a part keeps its existing `instrumentName` when the same GP track is
 *   still at that `trackIndex`: the old `trackNames[i]` equals the new one,
 *   or, for a file written before `trackNames` existed, the track count is
 *   unchanged. Otherwise it gets the new GP track name.
 */
export function mergeMeta(existing: unknown, generated: CatalogMeta): MergedCatalogMeta {
  if (!isRecord(existing)) return { ...generated };

  const kept: Record<string, unknown> = { ...existing };
  for (const key of DERIVED_KEYS) delete kept[key];

  const oldParts = Array.isArray(existing.parts) ? existing.parts.filter(isRecord) : [];
  const oldTrackNames = Array.isArray(existing.trackNames) ? existing.trackNames : null;
  const sameTrack = (i: number): boolean =>
    oldTrackNames ? oldTrackNames[i] === generated.trackNames[i] : oldParts.length === generated.parts.length;

  const parts = generated.parts.map((part) => {
    const old = oldParts.find((p) => p.trackIndex === part.trackIndex);
    if (old && nonEmptyString(old.instrumentName) && sameTrack(part.trackIndex)) {
      return { ...part, instrumentName: old.instrumentName };
    }
    return part;
  });

  return {
    ...kept,
    ...generated,
    name: nonEmptyString(existing.name) ? existing.name : generated.name,
    artist: nonEmptyString(existing.artist) ? existing.artist : generated.artist,
    parts,
  };
}

/**
 * Chooses a re-run's `lyricLineBreaks` (pipeline.md "Re-running on an
 * existing song"). Breaks are often hand-tuned to where lines start in the
 * recording, so the existing ones are kept while they still fit the
 * regenerated syllable stream: whole non-negative numbers, one per line of
 * text, summing to the dispatched syllable count (the stream `buildLrc`
 * groups). Otherwise the regenerated breaks are used, with a warning when
 * that discards existing ones.
 */
export function keepLineBreaks(
  existing: unknown,
  regenerated: number[],
  shape: { syllableCount: number; lineCount: number; song: string },
): number[] {
  const old = isRecord(existing) ? existing.lyricLineBreaks : undefined;
  if (!Array.isArray(old)) return regenerated;

  const wholeNumbers = old.every((n) => Number.isInteger(n) && n >= 0);
  const sum = wholeNumbers ? old.reduce((a: number, b: number) => a + b, 0) : NaN;
  if (wholeNumbers && old.length === shape.lineCount && sum === shape.syllableCount) return old as number[];

  if (JSON.stringify(old) !== JSON.stringify(regenerated)) {
    console.warn(
      `[extract-lyrics] ${shape.song}: existing lyricLineBreaks no longer fit (${old.length} lines summing to ${sum}; ` +
        `now ${shape.lineCount} lines and ${shape.syllableCount} syllables), regenerating them`,
    );
  }
  return regenerated;
}

export function readExistingMeta(metaPath: string): unknown {
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (err) {
    console.warn(`[publishSong] ${metaPath} is not valid JSON; writing a fresh meta.json (${(err as Error).message})`);
    return null;
  }
}

/**
 * Publishes one directory per song (catalog/<song-slug>/) containing the
 * source .gp file — served as-is, no transformed copy — together with its
 * generated .lrc and a small meta.json holding the lyrics pointer fields.
 * "What's the current output for song X" is just "look in that song's
 * directory" (pipeline.md, resolved On-Disk-Layout decision). An existing
 * meta.json is merged, not replaced (`mergeMeta`), so hand-set fields survive
 * a re-run.
 */
export function publishSong(catalogRoot: string, songSlug: string, sourceGpPath: string, lrcContent: string | null, meta: CatalogMeta): void {
  const songDir = path.join(catalogRoot, songSlug);
  fs.mkdirSync(songDir, { recursive: true });

  const destGp = path.join(songDir, path.basename(sourceGpPath));
  if (path.resolve(sourceGpPath) !== path.resolve(destGp)) fs.copyFileSync(sourceGpPath, destGp);

  if (lrcContent !== null) {
    fs.writeFileSync(path.join(songDir, 'lyrics.lrc'), lrcContent, 'utf8');
  }

  const metaPath = path.join(songDir, 'meta.json');
  const merged = mergeMeta(readExistingMeta(metaPath), meta);
  fs.writeFileSync(metaPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
