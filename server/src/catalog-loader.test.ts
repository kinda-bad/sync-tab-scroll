import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { CatalogSong } from '@sync-tab-scroll/shared';
import { loadCatalog, rescanCatalog, visibleCatalog } from './catalog-loader.js';
import type { LoadedCatalog } from './catalog-loader.js';

let catalogRoot: string;

beforeEach(() => {
  catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-'));
});

afterEach(() => {
  fs.rmSync(catalogRoot, { recursive: true, force: true });
});

function writeSong(dirName: string, opts: { meta?: object; gpFile?: boolean; lrc?: boolean; recording?: boolean | string } = {}) {
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
  if (opts.recording) {
    const fileName = typeof opts.recording === 'string' ? opts.recording : 'recording.mp3';
    fs.writeFileSync(path.join(songDir, fileName), 'id3-bytes');
  }
  return songDir;
}

/** A minimal valid FlatSyncPoint[] (alphaTab's shape) for meta.json fixtures. */
const SYNC_POINTS = [
  { barIndex: 0, barPosition: 0, barOccurence: 0, millisecondOffset: 0 },
  { barIndex: 8, barPosition: 0, barOccurence: 0, millisecondOffset: 12000 },
];

function metaWith(extra: object) {
  return {
    name: 'Creep',
    artist: 'Radiohead',
    parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    lyricsTrackIndex: 0,
    lyricsLineIndex: 0,
    lyricLineBreaks: [4],
    ...extra,
  };
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


  it('passes lyricsRawLine (and start-bar offset) through from meta.json to CatalogSong', () => {
    writeSong('creep', {
      meta: {
        name: 'Creep',
        artist: 'Radiohead',
        parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
        lyricsTrackIndex: 0,
        lyricsLineIndex: 0,
        lyricLineBreaks: [4],
        lyricsRawLine: 'When you were here be-fore',
        lyricsRawLineStartBar: 2,
      },
    });

    const { songs } = loadCatalog(catalogRoot);

    expect(songs[0].lyricsRawLine).toBe('When you were here be-fore');
    expect(songs[0].lyricsRawLineStartBar).toBe(2);
  });

  it('leaves lyricsRawLine undefined when meta.json omits it', () => {
    writeSong('creep');

    const { songs } = loadCatalog(catalogRoot);

    expect(songs[0].lyricsRawLine).toBeUndefined();
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

  it('ignores a macOS AppleDouble (._*) sidecar and selects the real .gp', () => {
    // A tar transfer that preserves xattrs (e.g. onto the Railway volume)
    // leaves a `._<name>.gp` companion beside the real file. It ends in
    // `.gp` and sorts/enumerates ahead of the real name, so a naive
    // `readdir().find()` picks the xattr blob and alphaTab can't parse it.
    // Create the sidecar first to bias enumeration toward the buggy pick.
    const songDir = path.join(catalogRoot, 'appledouble');
    fs.mkdirSync(songDir, { recursive: true });
    fs.writeFileSync(path.join(songDir, '._song.gp'), 'appledouble-xattr-blob');
    fs.writeFileSync(path.join(songDir, 'song.gp'), '');
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

    const { songs } = loadCatalog(catalogRoot);

    expect(songs).toHaveLength(1);
    expect(songs[0].gpFilePath).toBe('/catalog/appledouble/song.gp');
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

describe('loadCatalog recording discovery (T008/T009)', () => {
  it('exposes recordingPath (as a URL) and syncPoints when recording.mp3 and meta.syncPoints are both present', () => {
    writeSong('creep', { recording: true, meta: metaWith({ syncPoints: SYNC_POINTS }) });

    const { songs } = loadCatalog(catalogRoot);

    expect(songs[0].recordingPath).toBe('/catalog/creep/recording.mp3');
    expect(songs[0].syncPoints).toEqual(SYNC_POINTS);
  });

  it('leaves recordingPath null when no recording.mp3 is present (sync points in meta notwithstanding)', () => {
    writeSong('creep', { meta: metaWith({ syncPoints: SYNC_POINTS }) });

    const { songs } = loadCatalog(catalogRoot);

    expect(songs[0].recordingPath).toBeNull();
  });

  it('leaves syncPoints null when meta.json omits them', () => {
    writeSong('creep', { recording: true });

    const { songs } = loadCatalog(catalogRoot);

    expect(songs[0].syncPoints).toBeNull();
  });

  it('ignores a macOS AppleDouble (._recording.mp3) sidecar and only anchors on the real recording.mp3', () => {
    const songDir = writeSong('creep', { meta: metaWith({ syncPoints: SYNC_POINTS }) });
    // AppleDouble xattr blob left by a tar transfer; must not be treated as the recording.
    fs.writeFileSync(path.join(songDir, '._recording.mp3'), 'xattr-blob');

    const { songs } = loadCatalog(catalogRoot);

    // No real recording.mp3 written, so despite the sidecar the song is recording-less.
    expect(songs[0].recordingPath).toBeNull();
  });

  it('T009: treats a recording.mp3 with no sync points as recording-less (recordingPath null) and warns naming the song', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      writeSong('creep', { recording: true }); // recording present, no syncPoints in meta

      const { songs } = loadCatalog(catalogRoot);

      expect(songs[0].recordingPath).toBeNull();
      expect(songs[0].syncPoints).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0].join(' ')).toContain('creep');
    } finally {
      warn.mockRestore();
    }
  });

  it('T009: does NOT warn for an ordinary song with neither a recording nor sync points', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      writeSong('creep');

      loadCatalog(catalogRoot);

      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
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

  it('defaults a private catalogue\'s epoch to 1 when catalogue.json omits it (T012)', () => {
    fs.mkdirSync(path.join(catalogRoot, 'premium-pack'), { recursive: true });
    fs.writeFileSync(
      path.join(catalogRoot, 'premium-pack', 'catalogue.json'),
      JSON.stringify({ name: 'Premium Pack', salt: 'ab12', hash: 'deadbeef' }), // no epoch
    );
    writeNestedSong('premium-pack', 'creep');

    const premium = loadCatalog(catalogRoot).catalogues.find((c) => c.id === 'premium-pack');
    expect(premium?.epoch).toBe(1);
  });

  it('reads a private catalogue\'s epoch from catalogue.json when present (T012)', () => {
    fs.mkdirSync(path.join(catalogRoot, 'premium-pack'), { recursive: true });
    fs.writeFileSync(
      path.join(catalogRoot, 'premium-pack', 'catalogue.json'),
      JSON.stringify({ name: 'Premium Pack', salt: 'ab12', hash: 'deadbeef', epoch: 3 }),
    );
    writeNestedSong('premium-pack', 'creep');

    const premium = loadCatalog(catalogRoot).catalogues.find((c) => c.id === 'premium-pack');
    expect(premium?.epoch).toBe(3);
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
    recordingPath: null,
    syncPoints: null,
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
  it('excludes a locked private catalogue entirely — both its songs and its metadata — for a session that has not unlocked it', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: [] });

    expect(result.songs.map((s) => s.id)).toEqual(['creep']);
    // The locked catalogue's metadata is withheld too: the client never learns
    // it exists, its id, or its name (infrastructure.md).
    expect(result.catalogues.map((c) => c.id)).toEqual(['default']);
  });

  it('includes a private catalogue\'s metadata and songs once the session has unlocked it', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: ['premium-pack'] });

    expect(result.catalogues.map((c) => c.id).sort()).toEqual(['default', 'premium-pack']);
    expect(result.songs.map((s) => s.id).sort()).toEqual(['bonus', 'creep']);
  });

  it('never leaks salt/hash in the returned catalogue metadata', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: ['premium-pack'] });

    for (const c of result.catalogues) {
      expect(c).not.toHaveProperty('salt');
      expect(c).not.toHaveProperty('hash');
    }
  });

  it('T006: includes a private catalogue the requester owns, even though no one has unlocked it', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: [] }, ['premium-pack']);

    expect(result.catalogues.map((c) => c.id).sort()).toEqual(['default', 'premium-pack']);
    expect(result.songs.map((s) => s.id).sort()).toEqual(['bonus', 'creep']);
  });

  it('T006: an ownedCatalogueIds entry for an unknown/unloaded catalogue is inert (no crash, no leak)', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: [] }, ['ghost-catalogue']);

    expect(result.catalogues.map((c) => c.id)).toEqual(['default']);
  });

  it('T006: defaults ownedCatalogueIds to none when omitted (existing call sites unaffected)', () => {
    const result = visibleCatalog(mixedCatalog, { unlockedCatalogueIds: [] });

    expect(result.catalogues.map((c) => c.id)).toEqual(['default']);
  });
});

describe('rescanCatalog (T004)', () => {
  it('reassigns ctx.catalog in place to a fresh re-scan reflecting an on-disk change', () => {
    writeSong('creep');
    const ctx = { catalog: loadCatalog(catalogRoot) };
    expect(ctx.catalog.songs.map((s) => s.id)).toEqual(['creep']);

    writeSong('bonus');
    rescanCatalog(ctx, catalogRoot);

    expect(ctx.catalog.songs.map((s) => s.id).sort()).toEqual(['bonus', 'creep']);
  });

  it('threads requireSongConsent through to the re-scan', () => {
    writeSong('creep');
    const ctx = { catalog: loadCatalog(catalogRoot) };

    rescanCatalog(ctx, catalogRoot, true);

    // No consent record written ⇒ requireSongConsent drops it from the re-scan.
    expect(ctx.catalog.songs).toEqual([]);
  });
});
