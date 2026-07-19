import * as path from 'node:path';
import { loadScore, findLyricsSource, extractSyllables, extractSyllablesFromRawLine, buildTickToMs, buildMsToTick } from './gp-parser.js';
import { readRawLyricsLines, readRawLyricsLine, countSyllables, alignLinesByTimestamp, type RawLyricsLine } from './line-breaks.js';
import { isLegacyGpFile, readGp5RawLyricsLine } from './gp5-lyrics.js';
import { searchLrclib, parseLrclibLinesWithTimestamps } from './lrclib.js';
import { buildLrc, passthroughLrc } from './lrc-writer.js';
import { publishSong, slugify, type CatalogMeta, type CatalogPartMeta } from './catalog.js';

/**
 * Format-dispatching raw-line read (pipeline.md "Legacy GP3–5 Raw-Line
 * Extraction", T005): legacy `FICHIER GUITAR PRO…` binaries go through the
 * GP5 lyrics-block parser (the zip/gpif reader would throw on a non-zip
 * file); GP7/8 zips keep the gpif path. Track/line indexes only apply to
 * the gpif layout — the GP5 block is score-global, one lyric track.
 */
export function readRawLyricsLineAuto(gpFilePath: string, trackIndex: number, lineIndex = 0): RawLyricsLine | null {
  return isLegacyGpFile(gpFilePath) ? readGp5RawLyricsLine(gpFilePath) : readRawLyricsLine(gpFilePath, trackIndex, lineIndex);
}

/** Multi-line variant of the dispatch above — for legacy files the GP5 line's own newlines are the author's line breaks, mirroring the gpif reader's split/trim/filter. */
function readRawLyricsLinesAuto(gpFilePath: string, trackIndex: number, lineIndex: number): string[] | null {
  if (!isLegacyGpFile(gpFilePath)) return readRawLyricsLines(gpFilePath, trackIndex, lineIndex);
  const raw = readGp5RawLyricsLine(gpFilePath);
  if (!raw) return null;
  const lines = raw.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.length > 0 ? lines : null;
}

function parseSongFilename(gpFilePath: string): { artist: string; title: string } {
  const base = path.basename(gpFilePath);
  const match = base.match(/^(.+?)-(.+)-\d{2}-\d{2}-\d{4}\.gp$/i);
  if (!match) throw new Error(`Cannot parse artist/title from filename: ${base}`);
  return { artist: match[1], title: match[2] };
}

export async function extractLyrics(gpFilePath: string, catalogRoot: string): Promise<void> {
  const { artist, title } = parseSongFilename(gpFilePath);
  const songSlug = slugify(`${artist}-${title}`);

  const score = loadScore(gpFilePath);
  const source = findLyricsSource(score);

  const parts: CatalogPartMeta[] = score.tracks.map((track) => ({
    instrumentName: track.name,
    trackIndex: track.index,
  }));

  let lrcContent: string | null = null;
  let meta: CatalogMeta = {
    name: title,
    artist,
    parts,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
  };

  if (source) {
    // GP-semantics dispatch from the raw track-level line when it exists
    // (feedback F001 — alphaTab's applyLyrics diverges from GP: ties not
    // skipped, empty chunks burned only on playable beats); per-beat
    // walkSyllables stays the fallback for songs with no raw line.
    const rawLine = readRawLyricsLineAuto(gpFilePath, source.trackIndex, source.lineIndex);
    const syllables = rawLine
      ? extractSyllablesFromRawLine(score, source.trackIndex, rawLine.text)
      : extractSyllables(score, source);
    const tickToMs = buildTickToMs(score);
    const rawLines = readRawLyricsLinesAuto(gpFilePath, source.trackIndex, source.lineIndex);

    let lines: string[];
    let lyricLineBreaks: number[];

    if (rawLines && rawLines.length > 1) {
      lines = rawLines;
      lyricLineBreaks = rawLines.map(countSyllables);
    } else {
      const lrclibResult = await searchLrclib(title, artist);
      if (lrclibResult?.syncedLyrics) {
        const timedLines = parseLrclibLinesWithTimestamps(lrclibResult.syncedLyrics);
        lines = timedLines.map((l) => l.text);
        lyricLineBreaks = alignLinesByTimestamp(syllables, timedLines, buildMsToTick(score));
      } else {
        lines = rawLines ?? [syllables.map((s) => s.text).join(' ')];
        lyricLineBreaks = [syllables.length];
      }
    }

    lrcContent = buildLrc(lines, lyricLineBreaks, syllables, tickToMs);
    meta = { ...meta, lyricsTrackIndex: source.trackIndex, lyricsLineIndex: source.lineIndex, lyricLineBreaks };

    if (rawLine) {
      meta.lyricsRawLine = rawLine.text;
      if (rawLine.startBar !== 0) meta.lyricsRawLineStartBar = rawLine.startBar;
    }
  } else {
    const lrclibResult = await searchLrclib(title, artist);
    if (lrclibResult?.syncedLyrics) {
      lrcContent = passthroughLrc(lrclibResult.syncedLyrics);
    }
  }

  publishSong(catalogRoot, songSlug, gpFilePath, lrcContent, meta);
}

async function main(): Promise<void> {
  const [gpFilePath, catalogRoot] = process.argv.slice(2);
  if (!gpFilePath || !catalogRoot) {
    console.error('Usage: extract-lyrics <source.gp> <catalogRoot>');
    process.exit(1);
  }
  await extractLyrics(gpFilePath, catalogRoot);
  console.log(`Published ${gpFilePath} -> ${catalogRoot}`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
