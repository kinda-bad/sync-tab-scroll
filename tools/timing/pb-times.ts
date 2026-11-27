/**
 * Repeat-aware app-times: lyric syllables on alphaTab's *playback* timeline.
 *
 * Usage (from packages/pipeline):
 *   ./node_modules/.bin/tsx pb-times.ts <songDir> <bar1Ms> <endMs>
 *
 * Syllables come from meta.json's lyricsRawLine (as app-times.ts), then are
 * unrolled over alphaTab's MidiFileGenerator tickLookup (one entry per played
 * bar occurrence), the same way lyrics-unroll.ts `unrollSyllables` does: a
 * syllable in written bar B is emitted once per play of B, at
 * play.start + (tick - writtenBarStart[B]).
 * WRITTEN=1 env: ignore repeats (written order, each bar once), for comparison.
 * recMs is a placeholder map: linear in playback ticks from bar1Ms (tick 0)
 * to endMs (end of the last played bar).
 *
 * Output JSON (global_align.py-compatible "syllables" and "barStart"):
 *   ppq, occurrences [{barIndex, occurrence, start, end}], writtenBarStart,
 *   tempo [[playbackTick, bpm]], timeSig [[playbackTick, "n/d"]],
 *   barStart  playback start tick of each occurrence (+ end), so "bar" below
 *             is 1-based *occurrence* index, not written bar,
 *   syllables [{text, tick (playback), bar (occurrence #, 1-based),
 *               wbar (written bar, 1-based), occ, recMs}]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as at from '@coderline/alphatab';
import { loadScore, findLyricsSource, extractSyllables, extractSyllablesFromRawLine } from '../../packages/pipeline/src/gp-parser.ts';

const [dir, bar1S, endS] = process.argv.slice(2);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const gp = fs.readdirSync(dir).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!;
const score = loadScore(path.join(dir, gp));
const syl = meta.lyricsRawLine
  ? extractSyllablesFromRawLine(score, meta.lyricsTrackIndex, meta.lyricsRawLine)
  : extractSyllables(score, findLyricsSource(score)!);

const writtenBarStart: number[] = [];
let cum = 0;
for (const mb of score.masterBars) { writtenBarStart.push(cum); cum += mb.calculateDuration(); }
writtenBarStart.push(cum);

const midi = new at.midi.MidiFile();
const gen = new at.midi.MidiFileGenerator(score, new at.Settings(), new at.midi.AlphaSynthMidiFileHandler(midi));
gen.generate();
const seen = new Map<number, number>();
const written = process.env.WRITTEN === '1';
const occurrences = written
  ? score.masterBars.map((mb, i) => ({ barIndex: i, occurrence: 0, start: writtenBarStart[i], end: writtenBarStart[i + 1] }))
  : gen.tickLookup.masterBars.map((l) => {
  const bi = l.masterBar.index;
  const occ = seen.get(bi) ?? 0;
  seen.set(bi, occ + 1);
  return { barIndex: bi, occurrence: occ, start: l.start, end: l.end };
});
const endTick = occurrences[occurrences.length - 1].end;
const bar1 = Number(bar1S), endMs = Number(endS);
const recMs = (t: number) => bar1 + ((endMs - bar1) * t) / endTick;

const tempo: [number, number][] = [];
const timeSig: [number, string][] = [];
let lastSig = '';
for (const o of occurrences) {
  const mb = score.masterBars[o.barIndex];
  for (const a of mb.tempoAutomations ?? []) tempo.push([o.start + a.ratioPosition * (o.end - o.start), a.value]);
  const sig = `${mb.timeSignatureNumerator}/${mb.timeSignatureDenominator}`;
  if (sig !== lastSig) { timeSig.push([o.start, sig]); lastSig = sig; }
}
if (!tempo.length || tempo[0][0] > 0) tempo.unshift([0, score.tempo]);

const wbarOf = (t: number) => { let i = 0; while (i < writtenBarStart.length - 2 && t >= writtenBarStart[i + 1]) i++; return i; };
const out: any[] = [];
occurrences.forEach((o, oi) => {
  syl.forEach((s: any) => {
    if (wbarOf(s.tickPosition) !== o.barIndex) return;
    const tick = o.start + (s.tickPosition - writtenBarStart[o.barIndex]);
    out.push({ text: s.text, tick, bar: oi + 1, wbar: o.barIndex + 1, occ: o.occurrence, recMs: Math.round(recMs(tick)) });
  });
});
console.log(JSON.stringify({ ppq: 960, occurrences, writtenBarStart, tempo, timeSig, barStart: [...occurrences.map((o) => o.start), endTick], syllables: out }));
