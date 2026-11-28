/**
 * Dump a tab's per-track note-onset pattern in playback order, for
 * instrument-stem alignment (see stem_align.py).
 *
 * Usage (from packages/pipeline):
 *   ./node_modules/.bin/tsx tab-onsets.ts <songDir> > onsets.json
 *
 * Playback order comes from alphaTab's own MidiFileGenerator tickLookup
 * (MasterBarTickLookup, one entry per *played* bar occurrence), so repeats,
 * alternate endings and D.S./coda jumps are unrolled exactly as alphaTab plays
 * them. Each onset is a beat that starts a sounding note (not a rest, not a
 * pure tie continuation), at its playback tick:
 *   occurrence.start + (beat.playbackStart within the bar).
 *
 * Output JSON:
 *   ppq            960 (alphaTab ticks per quarter)
 *   tempo          [[playbackTick, bpm], ...] notated tempo changes
 *   writtenBarStart  written start tick of each master bar (+ total), what
 *                  FlatSyncPoint barIndex/barPosition refer to
 *   occurrences    [{barIndex, occurrence, start, end}] in playback order
 *                  (playback ticks); barOccurence for a sync point is
 *                  `occurrence`
 *   hasJumps       true if playback order differs from written order
 *   sections       [{barIndex, text}] section markers
 *   tracks         [{index, name, percussion, onsets: [[tick, nNotes, kind]]}]
 *                  kind: for percussion, 'k' kick, 's' snare, 'h' hat/cymbal,
 *                  't' tom, 'o' other (GM percussion numbers); for pitched
 *                  tracks the lowest MIDI note number as a string.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as at from '@coderline/alphatab';
import { loadScore } from '../../packages/pipeline/src/gp-parser.ts';

const dir = process.argv[2];
const gp = fs.readdirSync(dir).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!;
const score = loadScore(path.join(dir, gp));

const writtenBarStart: number[] = [];
let cum = 0;
for (const mb of score.masterBars) { writtenBarStart.push(cum); cum += mb.calculateDuration(); }
writtenBarStart.push(cum);

const midi = new at.midi.MidiFile();
const gen = new at.midi.MidiFileGenerator(score, new at.Settings(), new at.midi.AlphaSynthMidiFileHandler(midi));
gen.generate();
const seen = new Map<number, number>();
const occurrences = gen.tickLookup.masterBars.map((l) => {
  const bi = l.masterBar.index;
  const occ = seen.get(bi) ?? 0;
  seen.set(bi, occ + 1);
  return { barIndex: bi, occurrence: occ, start: l.start, end: l.end };
});
const hasJumps = occurrences.some((o, i) => o.barIndex !== i) || occurrences.length !== score.masterBars.length;

const tempo: [number, number][] = [];
for (const o of occurrences) {
  const mb = score.masterBars[o.barIndex];
  for (const a of mb.tempoAutomations ?? []) tempo.push([o.start + a.ratioPosition * (o.end - o.start), a.value]);
}
if (!tempo.length || tempo[0][0] > 0) tempo.unshift([0, score.tempo]);

const sections = score.masterBars.filter((mb) => mb.section).map((mb) => ({ barIndex: mb.index, text: `${mb.section!.marker ?? ''} ${mb.section!.text ?? ''}`.trim() }));

function percKind(n: number): string {
  if (n === 35 || n === 36) return 'k';
  if (n === 38 || n === 40 || n === 37 || n === 39) return 's';
  if ([41, 43, 45, 47, 48, 50].includes(n)) return 't';
  if ([42, 44, 46, 49, 51, 52, 53, 55, 57, 59].includes(n)) return 'h';
  return 'o';
}

const tracks = score.tracks.map((t) => {
  const perc = t.isPercussion;
  const onsets: [number, number, string][] = [];
  for (const o of occurrences) {
    for (const st of t.staves) {
      const bar = st.bars[o.barIndex];
      if (!bar) continue;
      for (const v of bar.voices) for (const b of v.beats) {
        if (b.isRest || b.isEmpty || !b.notes.length) continue;
        const sounding = b.notes.filter((n) => !n.isTieDestination);
        if (!sounding.length) continue;
        const tick = o.start + b.playbackStart;
        if (perc) {
          const kinds = new Set(sounding.map((n) => percKind(n.percussionArticulation >= 0 ? (t.percussionArticulations[n.percussionArticulation]?.outputMidiNumber ?? n.percussionArticulation) : n.realValue)));
          for (const k of kinds) onsets.push([tick, sounding.length, k]);
        } else {
          onsets.push([tick, sounding.length, String(Math.min(...sounding.map((n) => n.realValue)))]);
        }
      }
    }
  }
  onsets.sort((a, b) => a[0] - b[0]);
  return { index: t.index, name: t.name, percussion: perc, onsets };
});

console.log(JSON.stringify({ ppq: 960, tempo, writtenBarStart, occurrences, hasJumps, sections, tracks }));
