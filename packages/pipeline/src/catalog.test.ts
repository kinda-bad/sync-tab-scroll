import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { keepLineBreaks, mergeMeta, publishSong, type CatalogMeta } from './catalog.js';

function generated(overrides: Partial<CatalogMeta> = {}): CatalogMeta {
  return {
    name: 'Song',
    artist: 'Band',
    parts: [
      { instrumentName: 'Lead Guitar', trackIndex: 0 },
      { instrumentName: 'Bass', trackIndex: 1 },
    ],
    trackNames: ['Lead Guitar', 'Bass'],
    lyricsTrackIndex: 0,
    lyricsLineIndex: 0,
    lyricLineBreaks: [3, 4],
    lyricsRawLine: 'la la la',
    ...overrides,
  };
}

describe('mergeMeta', () => {
  it('returns the generated meta when there is no existing file', () => {
    expect(mergeMeta(null, generated())).toEqual(generated());
  });

  it('keeps fields the pipeline does not derive (syncPoints, defaultStartBar, unknown keys)', () => {
    const syncPoints = [{ barIndex: 0, barOccurence: 0, barPosition: 0, millisecondOffset: 1200 }];
    const existing = { ...generated(), syncPoints, defaultStartBar: 9, bpm: 120 };
    const merged = mergeMeta(existing, generated());
    expect(merged.syncPoints).toEqual(syncPoints);
    expect(merged.defaultStartBar).toBe(9);
    expect(merged.bpm).toBe(120);
  });

  it('regenerates the derived lyric fields from the new run', () => {
    const existing = { ...generated(), lyricLineBreaks: [7], lyricsRawLine: 'old line', lyricsTrackIndex: 1 };
    const merged = mergeMeta(existing, generated());
    expect(merged.lyricLineBreaks).toEqual([3, 4]);
    expect(merged.lyricsRawLine).toBe('la la la');
    expect(merged.lyricsTrackIndex).toBe(0);
  });

  it('drops an optional derived field the new run no longer produces', () => {
    const existing = { ...generated(), lyricsRawLineStartBar: 4 };
    const fresh = generated({ lyricsRawLine: undefined });
    delete fresh.lyricsRawLine;
    const merged = mergeMeta(existing, fresh);
    expect('lyricsRawLineStartBar' in merged).toBe(false);
    expect('lyricsRawLine' in merged).toBe(false);
  });

  it('keeps a hand-set name and artist (the filename cannot hold every character)', () => {
    const existing = { ...generated(), name: 'Song?', artist: 'The Band' };
    const merged = mergeMeta(existing, generated());
    expect(merged.name).toBe('Song?');
    expect(merged.artist).toBe('The Band');
  });

  it('keeps a hand-named part when the same GP track is still at that index', () => {
    const existing = {
      ...generated(),
      parts: [
        { instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 },
        { instrumentName: 'Bo (Bass)', trackIndex: 1 },
      ],
    };
    const merged = mergeMeta(existing, generated());
    expect(merged.parts).toEqual([
      { instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 },
      { instrumentName: 'Bo (Bass)', trackIndex: 1 },
    ]);
    expect(merged.trackNames).toEqual(['Lead Guitar', 'Bass']);
  });

  it('uses the new GP name for a track whose GP name changed, keeping the others', () => {
    const existing = {
      ...generated(),
      parts: [
        { instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 },
        { instrumentName: 'Bo (Bass)', trackIndex: 1 },
      ],
    };
    const fresh = generated({
      parts: [
        { instrumentName: 'Lead Guitar', trackIndex: 0 },
        { instrumentName: 'Keys', trackIndex: 1 },
      ],
      trackNames: ['Lead Guitar', 'Keys'],
    });
    expect(mergeMeta(existing, fresh).parts).toEqual([
      { instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 },
      { instrumentName: 'Keys', trackIndex: 1 },
    ]);
  });

  it('uses the GP name for a track that is new at its index', () => {
    const existing = { ...generated(), parts: [{ instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 }], trackNames: ['Lead Guitar'] };
    expect(mergeMeta(existing, generated()).parts).toEqual([
      { instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 },
      { instrumentName: 'Bass', trackIndex: 1 },
    ]);
  });

  describe('legacy meta.json without trackNames', () => {
    it('keeps hand names when the track count is unchanged', () => {
      const existing: Record<string, unknown> = {
        ...generated(),
        parts: [
          { instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 },
          { instrumentName: 'Bo (Bass)', trackIndex: 1 },
        ],
      };
      delete existing.trackNames;
      expect(mergeMeta(existing, generated()).parts.map((p) => p.instrumentName)).toEqual(['Ann (Lead Guitar)', 'Bo (Bass)']);
    });

    it('falls back to the GP names when the track count changed', () => {
      const existing: Record<string, unknown> = {
        ...generated(),
        parts: [{ instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 }],
      };
      delete existing.trackNames;
      expect(mergeMeta(existing, generated()).parts.map((p) => p.instrumentName)).toEqual(['Lead Guitar', 'Bass']);
    });
  });
});

describe('publishSong', () => {
  function setup(): { catalogRoot: string; gp: string; metaPath: string } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-song-'));
    const gp = path.join(dir, 'Band-Song-01-01-2026.gp');
    fs.writeFileSync(gp, 'not really a gp file');
    const catalogRoot = path.join(dir, 'catalog');
    return { catalogRoot, gp, metaPath: path.join(catalogRoot, 'band-song', 'meta.json') };
  }

  it('merges into an existing meta.json instead of replacing it', () => {
    const { catalogRoot, gp, metaPath } = setup();
    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        ...generated(),
        parts: [
          { instrumentName: 'Ann (Lead Guitar)', trackIndex: 0 },
          { instrumentName: 'Bass', trackIndex: 1 },
        ],
        syncPoints: [{ barIndex: 0, barOccurence: 0, barPosition: 0, millisecondOffset: 0 }],
        defaultStartBar: 9,
      }),
    );

    publishSong(catalogRoot, 'band-song', gp, null, generated({ lyricLineBreaks: [7] }));

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    expect(meta.defaultStartBar).toBe(9);
    expect(meta.syncPoints).toHaveLength(1);
    expect(meta.parts[0].instrumentName).toBe('Ann (Lead Guitar)');
    expect(meta.lyricLineBreaks).toEqual([7]);
  });

  it('writes the generated meta when there is no existing file', () => {
    const { catalogRoot, gp, metaPath } = setup();
    publishSong(catalogRoot, 'band-song', gp, null, generated());
    expect(JSON.parse(fs.readFileSync(metaPath, 'utf8'))).toEqual(generated());
  });

  it('warns and writes fresh when the existing meta.json is not valid JSON', () => {
    const { catalogRoot, gp, metaPath } = setup();
    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, '{ not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    publishSong(catalogRoot, 'band-song', gp, null, generated());
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    expect(JSON.parse(fs.readFileSync(metaPath, 'utf8'))).toEqual(generated());
  });
});

describe('keepLineBreaks', () => {
  const regenerated = [3, 4];
  const shape = { syllableCount: 7, lineCount: 2, song: 'band-song' };

  it('keeps hand-tuned breaks that still fit the regenerated syllables', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(keepLineBreaks({ lyricLineBreaks: [5, 2] }, regenerated, shape)).toEqual([5, 2]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('regenerates with a warning when the sum no longer matches the syllable count', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(keepLineBreaks({ lyricLineBreaks: [5, 3] }, regenerated, shape)).toEqual([3, 4]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('band-song'));
    warn.mockRestore();
  });

  it('regenerates with a warning when the line count changed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(keepLineBreaks({ lyricLineBreaks: [7] }, regenerated, shape)).toEqual([3, 4]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('regenerates silently when there were no breaks before', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(keepLineBreaks(null, regenerated, shape)).toEqual([3, 4]);
    expect(keepLineBreaks({ lyricLineBreaks: null }, regenerated, shape)).toEqual([3, 4]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('rejects entries that are not whole non-negative numbers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(keepLineBreaks({ lyricLineBreaks: [7.5, -0.5] }, regenerated, shape)).toEqual([3, 4]);
    expect(keepLineBreaks({ lyricLineBreaks: ['5', 2] }, regenerated, shape)).toEqual([3, 4]);
    warn.mockRestore();
  });
});
