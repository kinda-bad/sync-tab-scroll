import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { CatalogSong } from '@sync-tab-scroll/shared';
import { loadCatalog, visibleCatalog } from './catalog-loader.js';
import type { LoadedCatalog } from './catalog-loader.js';

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
    expect(loadCatalog(path.join(catalogRoot, 'does-not-exist'))).toEqual({ catalogues: [], songs: [] });
  });

  it('loads a well-formed song directory into a matching CatalogSong', () => {
    writeSong('creep');

    const { songs } = loadCatalog(catalogRoot);

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

    const { songs } = loadCatalog(catalogRoot);

    expect(songs[0].lyricsLrc).toBe('/catalog/creep/lyrics.lrc');
  });

  it('skips a directory missing meta.json without throwing, keeping valid ones', () => {
    writeSong('broken', { meta: null as unknown as object });
    writeSong('creep');

    const { songs } = loadCatalog(catalogRoot);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });

  it('skips a directory with no .gp file without throwing, keeping valid ones', () => {
    writeSong('no-gp', { gpFile: false });
    writeSong('creep');

    const { songs } = loadCatalog(catalogRoot);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });

  it('loads every song regardless of consent.json when requireSongConsent is false (default)', () => {
    writeSong('creep');

    const { songs } = loadCatalog(catalogRoot, false);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });

  it('excludes a song directory lacking a valid consent record when requireSongConsent is true', () => {
    writeSong('creep');

    const { songs } = loadCatalog(catalogRoot, true);

    expect(songs).toEqual([]);
  });

  it('includes a song directory with a valid consent record when requireSongConsent is true', () => {
    const songDir = writeSong('creep');
    fs.writeFileSync(
      path.join(songDir, 'consent.json'),
      JSON.stringify({ submitterName: 'Alice', tosVersion: 'dev-placeholder', acceptedAt: 1 }),
    );

    const { songs } = loadCatalog(catalogRoot, true);

    expect(songs.map((s) => s.id)).toEqual(['creep']);
  });
});

/** Writes a song directory nested one level inside a catalogue directory. */
function writeNestedSong(catalogueSlug: string, dirName: string) {
  const songDir = path.join(catalogRoot, catalogueSlug, dirName);
  fs.mkdirSync(songDir, { recursive: true });
  fs.writeFileSync(
    path.join(songDir, 'meta.json'),
    JSON.stringify({
      name: 'Creep',
      artist: 'Radiohead',
      parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
      lyricsTrackIndex: 0,
      lyricsLineIndex: 0,
      lyricLineBreaks: [4],
    }),
  );
  fs.writeFileSync(path.join(songDir, 'song.gp'), '');
  return songDir;
}

describe('loadCatalog catalogue discovery', () => {
  it('tags a flat song directory with catalogueId "default" and lists a public "default" Catalogue', () => {
    writeSong('creep');

    const { catalogues, songs } = loadCatalog(catalogRoot);

    expect(songs).toHaveLength(1);
    expect(songs[0].catalogueId).toBe('default');
    expect(catalogues).toContainEqual({ id: 'default', name: 'default', public: true });
  });

  it('treats a subdirectory containing catalogue.json as a private Catalogue and tags its nested songs', () => {
    fs.mkdirSync(path.join(catalogRoot, 'premium-pack'), { recursive: true });
    fs.writeFileSync(
      path.join(catalogRoot, 'premium-pack', 'catalogue.json'),
      JSON.stringify({ name: 'Premium Pack', salt: 'ab12', hash: 'deadbeef' }),
    );
    writeNestedSong('premium-pack', 'creep');

    const { catalogues, songs } = loadCatalog(catalogRoot);

    const premium = catalogues.find((c) => c.id === 'premium-pack');
    expect(premium).toMatchObject({ id: 'premium-pack', name: 'Premium Pack', public: false });
    expect(songs.map((s) => ({ id: s.id, catalogueId: s.catalogueId }))).toContainEqual({ id: 'creep', catalogueId: 'premium-pack' });
  });

  it('treats a subdirectory with nested song dirs but no catalogue.json as a public Catalogue', () => {
    writeNestedSong('free-pack', 'creep');

    const { catalogues, songs } = loadCatalog(catalogRoot);

    const free = catalogues.find((c) => c.id === 'free-pack');
    expect(free).toMatchObject({ id: 'free-pack', public: true });
    expect(songs.find((s) => s.id === 'creep')?.catalogueId).toBe('free-pack');
  });

  it('rewrites a nested song\'s gpFilePath to include the catalogue slug', () => {
    writeNestedSong('premium-pack', 'creep');
    fs.writeFileSync(
      path.join(catalogRoot, 'premium-pack', 'catalogue.json'),
      JSON.stringify({ name: 'Premium Pack', salt: 'ab12', hash: 'deadbeef' }),
    );

    const { songs } = loadCatalog(catalogRoot);

    expect(songs.find((s) => s.id === 'creep')?.gpFilePath).toBe('/catalog/premium-pack/creep/song.gp');
  });
});

function song(id: string, catalogueId: string): CatalogSong {
  return {
    id,
    catalogueId,
    name: id,
    artist: 'Artist',
    gpFilePath: `/catalog/${id}/song.gp`,
    parts: [],
    lyricsLrc: null,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
  };
}

const mixedCatalog: LoadedCatalog = {
  catalogues: [
    { id: 'default', name: 'default', public: true },
    { id: 'premium-pack', name: 'Premium Pack', public: false, salt: 'ab12', hash: 'deadbeef' },
  ],
  songs: [song('creep', 'default'), song('bonus', 'premium-pack')],
};

describe('visibleCatalog', () => {
  it('excludes a private catalogue\'s songs but keeps its metadata for a session that has not unlocked it', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: [] });

    expect(result.songs.map((s) => s.id)).toEqual(['creep']);
    expect(result.catalogues.map((c) => c.id)).toEqual(['default', 'premium-pack']);
  });

  it('includes a private catalogue\'s songs once the session has unlocked it', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: ['premium-pack'] });

    expect(result.songs.map((s) => s.id).sort()).toEqual(['bonus', 'creep']);
  });

  it('never leaks salt/hash in the returned catalogue metadata', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: ['premium-pack'] });

    for (const c of result.catalogues) {
      expect(c).not.toHaveProperty('salt');
      expect(c).not.toHaveProperty('hash');
    }
  });
});
