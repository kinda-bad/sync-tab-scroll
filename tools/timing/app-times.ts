import fs from 'node:fs';
import path from 'node:path';
import { loadScore, findLyricsSource, extractSyllables, extractSyllablesFromRawLine } from '../../packages/pipeline/src/gp-parser.ts';

// Usage: app-times.ts <songDir>  -> JSON of syllables with tab tick and recording ms
const dir = process.argv[2];
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const gp = fs.readdirSync(dir).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!;
const score = loadScore(path.join(dir, gp));
const trackIndex = meta.lyricsTrackIndex;
const syl = meta.lyricsRawLine
  ? extractSyllablesFromRawLine(score, trackIndex, meta.lyricsRawLine)
  : extractSyllables(score, findLyricsSource(score)!);

// Same mapping as client/src/playback-sync.ts: sync points pin bar positions
// to recording ms; linear between anchors, extrapolated past the ends.
const barStart: number[] = [];
let cum = 0;
for (const mb of score.masterBars) { barStart.push(cum); cum += mb.calculateDuration(); }
const anchors = (meta.syncPoints ?? [])
  .map((p: any) => ({ tick: barStart[p.barIndex] + p.barPosition * score.masterBars[p.barIndex].calculateDuration(), ms: p.millisecondOffset }))
  .sort((a: any, b: any) => a.tick - b.tick);
function tickToRecMs(t: number): number {
  let i = 0;
  while (i < anchors.length - 2 && t >= anchors[i + 1].tick) i++;
  const a = anchors[i], b = anchors[i + 1];
  return a.ms + ((t - a.tick) * (b.ms - a.ms)) / (b.tick - a.tick);
}
const barOf = (t: number) => { let i = 0; while (i < barStart.length - 1 && t >= barStart[i + 1]) i++; return i + 1; };
const out = syl.map((s: any) => ({ text: s.text, tick: s.tickPosition, bar: barOf(s.tickPosition), recMs: Math.round(tickToRecMs(s.tickPosition)) }));
console.log(JSON.stringify({ anchors: anchors.length, barStart: [...barStart, cum], syllables: out }));
