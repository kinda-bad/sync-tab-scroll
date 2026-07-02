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
  lyricsTrackIndex: number | null;
  lyricsLineIndex: number | null;
  lyricLineBreaks: number[] | null;
}

/**
 * Publishes one directory per song (catalog/<song-slug>/) containing the
 * source .gp file — served as-is, no transformed copy — together with its
 * generated .lrc and a small meta.json holding the lyrics pointer fields.
 * "What's the current output for song X" is just "look in that song's
 * directory" (pipeline.md, resolved On-Disk-Layout decision).
 */
export function publishSong(catalogRoot: string, songSlug: string, sourceGpPath: string, lrcContent: string | null, meta: CatalogMeta): void {
  const songDir = path.join(catalogRoot, songSlug);
  fs.mkdirSync(songDir, { recursive: true });

  fs.copyFileSync(sourceGpPath, path.join(songDir, path.basename(sourceGpPath)));

  if (lrcContent !== null) {
    fs.writeFileSync(path.join(songDir, 'lyrics.lrc'), lrcContent, 'utf8');
  }

  fs.writeFileSync(path.join(songDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
