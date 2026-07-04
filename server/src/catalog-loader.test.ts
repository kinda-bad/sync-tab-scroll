import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadCatalog } from './catalog-loader.js';

let catalogRoot: string;

beforeEach(() => {
  catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-'));
});

afterEach(() => {
  fs.rmSync(catalogRoot, { recursive: true, force: true });
});

function writeSong(dirName: string, opts: { meta?: object; gpFile?: boolean; lrc?: boolean } = {}) {
  const songDir = path.join(catalogRoot, dirName);
  fs.mkdirSync(songDir, { recursive: true });
  if (opts.meta !== null) {
    fs.writeFileSync(
      path.join(songDir, 'meta.json'),
      JSON.stringify(
        opts.meta ?? {
          name: 'Creep',
          artist: 'Radiohead',
          parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
          lyricsTrackIndex: 0,
          lyricsLineIndex: 0,
          lyricLineBreaks: [4],
        },
      ),
    );
  }
  if (opts.gpFile !== false) fs.writeFileSync(path.join(songDir, 'song.gp'), '');
  if (opts.lrc) fs.writeFileSync(path.join(songDir, 'lyrics.lrc'), '');
  return songDir;
}

describe('loadCatalog', () => {
  it('returns [] for a nonexistent catalogRoot', () => {
    expect(loadCatalog(path.join(catalogRoot, 'does-not-exist'))).toEqual([]);
  });

  it('loads a well-formed song directory into a matching CatalogSong', () => {
    writeSong('creep');

    const songs = loadCatalog(catalogRoot);

    expect(songs).toHaveLength(1);
    expect(songs[0]).toMatchObject({
      id: 'creep',
      name: 'Creep',
      artist: 'Radiohead',
      gpFilePath: '/catalog/creep/song.gp',
      parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
      lyricsLrc: null,
      lyricsTrackIndex: 0,
      lyricsLineIndex: 0,
      lyricLineBreaks: [4],
    });
  });

  it('sets lyricsLrc to a URL path when lyrics.lrc is present', () => {
    writeSong('creep', { lrc: true });

    const songs = loadCatalog(catalogRoot);

    expect(songs[0].lyricsLrc).toBe('/catalog/creep/lyrics.lrc');
  });

  it('skips a directory missing meta.json without throwing, keeping valid ones', () => {
    writeSong('broken', { meta: null as unknown as object });
    writeSong('creep');

    const songs = loadCatalog(catalogRoot);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });

  it('skips a directory with no .gp file without throwing, keeping valid ones', () => {
    writeSong('no-gp', { gpFile: false });
    writeSong('creep');

    const songs = loadCatalog(catalogRoot);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });

  it('loads every song regardless of consent.json when requireSongConsent is false (default)', () => {
    writeSong('creep');

    const songs = loadCatalog(catalogRoot, false);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });

  it('excludes a song directory lacking a valid consent record when requireSongConsent is true', () => {
    writeSong('creep');

    const songs = loadCatalog(catalogRoot, true);

    expect(songs).toEqual([]);
  });

  it('includes a song directory with a valid consent record when requireSongConsent is true', () => {
    const songDir = writeSong('creep');
    fs.writeFileSync(
      path.join(songDir, 'consent.json'),
      JSON.stringify({ submitterName: 'Alice', tosVersion: 'dev-placeholder', acceptedAt: 1 }),
    );

    const songs = loadCatalog(catalogRoot, true);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });
});
