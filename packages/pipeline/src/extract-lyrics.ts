import * as path from 'node:path';
import { loadScore, findLyricsSource, extractSyllables, buildTickToMs } from './gp-parser.js';
import { readRawLyricsLines, countSyllables } from './line-breaks.js';
import { searchLrclib, parseLrclibLines } from './lrclib.js';
import { buildLrc, passthroughLrc } from './lrc-writer.js';
import { publishSong, slugify, type CatalogMeta, type CatalogPartMeta } from './catalog.js';

function parseSongFilename(gpFilePath: string): { artist: string; title: string } {
  const base = path.basename(gpFilePath);
  const match = base.match(/^(.+?)-(.+)-\d{2}-\d{2}-\d{4}\.gp$/i);
  if (!match) throw new Error(`Cannot parse artist/title from filename: ${base}`);
  return { artist: match[1], title: match[2] };
}

/** Distributes a flat syllable count across lrclib-derived lines proportionally to each line's word count — a best-effort fallback when GP marks no line breaks of its own. */
function distributeByWordCount(totalSyllables: number, lrclibLines: string[]): number[] {
  const wordCounts = lrclibLines.map((l) => l.split(/\s+/).filter(Boolean).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0) || 1;
  const counts = wordCounts.map((w) => Math.round((w / totalWords) * totalSyllables));
  const diff = totalSyllables - counts.reduce((a, b) => a + b, 0);
  if (counts.length > 0) counts[counts.length - 1] += diff;
  return counts;
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
        lines = parseLrclibLines(lrclibResult.syncedLyrics);
        lyricLineBreaks = distributeByWordCount(syllables.length, lines);
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
