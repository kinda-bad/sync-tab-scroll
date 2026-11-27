// Rebuild a tab-lyric song's lyrics.lrc from its own .gp, meta.json and current
// lyrics.lrc line texts, with a given lyricLineBreaks, using the pipeline's own
// functions (same calls as extract-lyrics.ts) and without querying lrclib.
//
// Usage (from packages/pipeline):
//   npx tsx rebuild-lrc.ts <songDir> <breaks.json | -> <out.lrc>
// <breaks.json> is a JSON array or an object with a `lyricLineBreaks` array;
// `-` uses meta.json's lyricLineBreaks (a round-trip check: the output should
// equal the current lyrics.lrc byte for byte).
// Line texts are the current LRC's non-blank entries, in order. That only
// recovers every line when no line had 0 syllables (buildLrc skips those),
// so the script refuses unless the counts match.
import fs from 'node:fs';
import path from 'node:path';
import { loadScore, findLyricsSource, extractSyllables, extractSyllablesFromRawLine, buildTickToMs } from '../../packages/pipeline/src/gp-parser.ts';
import { readRawLyricsLineAuto } from '../../packages/pipeline/src/extract-lyrics.ts';
import { buildLrc } from '../../packages/pipeline/src/lrc-writer.ts';

const [dir, breaksArg, outPath] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const gp = path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!);
const score = loadScore(gp);
const source = findLyricsSource(score);
if (!source || source.trackIndex !== meta.lyricsTrackIndex || source.lineIndex !== meta.lyricsLineIndex) throw new Error('lyrics source differs from meta.json');
const rawLine = readRawLyricsLineAuto(gp, source.trackIndex, source.lineIndex);
const syllables = rawLine ? extractSyllablesFromRawLine(score, source.trackIndex, rawLine.text) : extractSyllables(score, source);
const tickToMs = buildTickToMs(score);

const breaksJson = breaksArg === '-' ? meta.lyricLineBreaks : JSON.parse(fs.readFileSync(breaksArg, 'utf8'));
const breaks: number[] = Array.isArray(breaksJson) ? breaksJson : breaksJson.lyricLineBreaks;
const lines = fs
  .readFileSync(path.join(dir, 'lyrics.lrc'), 'utf8')
  .split('\n')
  .map((l) => l.match(/^\[\d+:\d+\.\d+\](.*)$/))
  .filter((m): m is RegExpMatchArray => !!m && m[1].length > 0)
  .map((m) => m[1]);
const oldBreaks: number[] = meta.lyricLineBreaks;
if (oldBreaks.some((n) => n === 0) || lines.length !== oldBreaks.length) throw new Error(`cannot recover line texts: ${lines.length} LRC lines vs ${oldBreaks.length} breaks`);
if (breaks.length !== lines.length) throw new Error(`breaks has ${breaks.length} lines, LRC has ${lines.length}`);
const sum = breaks.reduce((a, b) => a + b, 0);
if (sum !== syllables.length) throw new Error(`breaks sum ${sum} != ${syllables.length} dispatched syllables`);

fs.writeFileSync(outPath, buildLrc(lines, breaks, syllables, tickToMs), 'utf8');
console.log(`wrote ${outPath}: ${lines.length} lines, ${syllables.length} syllables`);
