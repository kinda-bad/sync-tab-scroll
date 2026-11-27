/**
 * Check FlatSyncPoints through alphaTab's own sync machinery.
 *
 * Usage (from packages/pipeline):
 *   ./node_modules/.bin/tsx verify-sync.ts <songDir> <fit.json|meta.json> <anchors.json>
 *
 * Applies the syncPoints with Score.applyFlatSyncPoints, runs
 * MidiFileGenerator.generateSyncPoints (what the player uses), then maps every
 * played-bar start to backing-track ms the way
 * MidiFileSequencer.mainTimePositionToBackingTrack does (linear in synth time
 * between consecutive sync points). Compares with the intended map in
 * anchors.json (piecewise linear in playback ticks) and prints the worst
 * difference, plus the generated points (bar, occurrence, synthTick, ms).
 */
import fs from 'node:fs';
import path from 'node:path';
import * as at from '@coderline/alphatab';
import { loadScore } from '../../packages/pipeline/src/gp-parser.ts';

const [dir, spFile, ancFile] = process.argv.slice(2);
const gp = fs.readdirSync(dir).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!;
const score = loadScore(path.join(dir, gp));
const sp = JSON.parse(fs.readFileSync(spFile, 'utf8')).syncPoints;
const anc: [number, number][] = JSON.parse(fs.readFileSync(ancFile, 'utf8')).anchors;
score.applyFlatSyncPoints(sp);
const gen = (at.midi.MidiFileGenerator as any).generateSyncPoints(score) as any[];
const midi = new at.midi.MidiFile();
const mg = new at.midi.MidiFileGenerator(score, new at.Settings(), new at.midi.AlphaSynthMidiFileHandler(midi));
mg.generate();
const plays = mg.tickLookup.masterBars;
// notated synth ms of a playback tick, from the generated points' synthBpm
// (constant between points) — rebuild from tempo automations along playback.
const tempo: [number, number][] = [];
for (const l of plays) for (const a of l.masterBar.tempoAutomations ?? []) tempo.push([l.start + a.ratioPosition * (l.end - l.start), a.value]);
if (!tempo.length || tempo[0][0] > 0) tempo.unshift([0, score.tempo]);
const synth = (t: number) => {
  let ms = 0;
  for (let i = 0; i < tempo.length; i++) {
    const [t0, b] = tempo[i]; const t1 = i + 1 < tempo.length ? tempo[i + 1][0] : Infinity;
    if (t <= t0) break;
    ms += ((Math.min(t, t1) - t0) * 60000) / (b * 960);
  }
  return ms;
};
const toBacking = (t: number) => {
  const st = synth(t);
  let i = 0;
  while (i + 1 < gen.length && gen[i + 1].synthTime <= st) i++;
  const a = gen[i], b = gen[Math.min(i + 1, gen.length - 1)];
  if (b === a) return a.syncTime + (st - a.synthTime) * (a.synthBpm / a.syncBpm);
  return a.syncTime + ((st - a.synthTime) * (b.syncTime - a.syncTime)) / (b.synthTime - a.synthTime);
};
const want = (t: number) => {
  let i = 0;
  while (i < anc.length - 2 && t >= anc[i + 1][0]) i++;
  const [t0, m0] = anc[i], [t1, m1] = anc[i + 1];
  return m0 + ((t - t0) * (m1 - m0)) / (t1 - t0);
};
let worst = 0, worstAt = '';
const seen = new Map<number, number>();
for (const l of plays) {
  const bi = l.masterBar.index; const occ = seen.get(bi) ?? 0; seen.set(bi, occ + 1);
  for (const t of [l.start, (l.start + l.end) / 2]) {
    if (t < anc[0][0]) continue;
    const d = toBacking(t) - want(t);
    if (Math.abs(d) > Math.abs(worst)) { worst = d; worstAt = `bar ${bi + 1} pass ${occ + 1} tick ${t}`; }
  }
}
const end = plays[plays.length - 1].end;
console.log(`generated ${gen.length} sync points; end of last bar -> ${toBacking(end).toFixed(1)} ms (intended ${want(end).toFixed(1)})`);
console.log(`worst |alphaTab - intended| over bar starts/middles: ${worst.toFixed(2)} ms at ${worstAt}`);
for (const g of gen) console.log(`  bar ${g.masterBarIndex + 1} occ ${g.masterBarOccurence} synthTick ${g.synthTick} synthMs ${g.synthTime.toFixed(1)} -> ${g.syncTime.toFixed(1)} ms`);
