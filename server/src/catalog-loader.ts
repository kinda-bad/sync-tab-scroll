import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CatalogPart, CatalogSong } from '@sync-tab-scroll/shared';

interface SongMeta {
  name: string;
  artist: string;
  parts: CatalogPart[];
  lyricsTrackIndex: number | null;
  lyricsLineIndex: number | null;
  lyricLineBreaks: number[] | null;
}

/**
 * Scans catalog/<song-slug>/ directories at server startup and builds
 * in-memory CatalogSong entries from each directory's meta.json and file
 * contents. The pipeline is the only writer of this directory structure
 * (pipeline.md) — the server only ever reads it.
 */
export function loadCatalog(catalogRoot: string): CatalogSong[] {
  if (!fs.existsSync(catalogRoot)) return [];

  const songDirs = fs.readdirSync(catalogRoot, { withFileTypes: true }).filter((e) => e.isDirectory());

  return songDirs.map((dir) => {
    const songDir = path.join(catalogRoot, dir.name);
    const meta: SongMeta = JSON.parse(fs.readFileSync(path.join(songDir, 'meta.json'), 'utf8'));

    const gpFile = fs.readdirSync(songDir).find((f) => f.endsWith('.gp'));
    if (!gpFile) throw new Error(`No .gp file found in catalog directory: ${songDir}`);

    const lrcPath = path.join(songDir, 'lyrics.lrc');
    const urlPrefix = `/catalog/${dir.name}`;

    const song: CatalogSong = {
      id: dir.name,
      name: meta.name,
      artist: meta.artist,
      gpFilePath: `${urlPrefix}/${gpFile}`,
      parts: meta.parts,
      lyricsLrc: fs.existsSync(lrcPath) ? `${urlPrefix}/lyrics.lrc` : null,
      lyricsTrackIndex: meta.lyricsTrackIndex,
      lyricsLineIndex: meta.lyricsLineIndex,
      lyricLineBreaks: meta.lyricLineBreaks,
    };
    return song;
  });
}
