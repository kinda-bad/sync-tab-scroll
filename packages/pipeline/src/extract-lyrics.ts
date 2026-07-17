import * as path from 'node:path';
import { loadScore, findLyricsSource, extractSyllables, buildTickToMs, buildMsToTick } from './gp-parser.js';
import { readRawLyricsLines, countSyllables, alignLinesByTimestamp } from './line-breaks.js';
import { searchLrclib, parseLrclibLinesWithTimestamps } from './lrclib.js';
import { buildLrc, passthroughLrc } from './lrc-writer.js';
import { publishSong, slugify, type CatalogMeta, type CatalogPartMeta } from './catalog.js';

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
    const syllables = extractSyllables(score, source);
    const tickToMs = buildTickToMs(score);
    const rawLines = readRawLyricsLines(gpFilePath, source.trackIndex, source.lineIndex);

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
