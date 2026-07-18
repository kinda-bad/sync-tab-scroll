import { loadScore } from './gp-parser.js';
import * as at from '@coderline/alphatab';
import AdmZip from 'adm-zip';

const GP = '../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp';
const xml = new AdmZip(GP).readAsText('Content/score.gpif');
const raw = [...xml.matchAll(/<Lyrics dispatched="true">([\s\S]*?)<\/Lyrics>/g)]
  .flatMap(mm => [...mm[1].matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map(c => c[1]))
  .filter(t => t.trim().length > 0).sort((a, b) => b.length - a.length)[0];

const score = loadScore(GP);
const t = score.tracks[1];
const beats: { tick: number; bar: number; rest: boolean; tieDest: boolean }[] = [];
for (const st of t.staves) for (const bar of st.bars) for (const b of bar.voices[0].beats)
  beats.push({ tick: b.absolutePlaybackStart, bar: bar.index + 1, rest: b.isRest, tieDest: b.notes?.some(n => n.isTieDestination) ?? false });

function chunksOf(skipEmpty: boolean): string[] {
  const ly = new at.model.Lyrics(); ly.text = raw; (ly as any).finish(skipEmpty);
  return (ly as any).chunks;
}
function run(skipEmpty: boolean, skipTies: boolean) {
  const chunks = chunksOf(skipEmpty);
  const out: (string | null)[] = beats.map(() => null);
  let ci = 0;
  for (let i = 0; i < beats.length && ci < chunks.length; i++) {
    if (beats[i].rest) continue;
    if (skipTies && beats[i].tieDest) continue;
    out[i] = chunks[ci++];
  }
  const syl = beats.map((b, i) => ({ ...b, lyric: out[i] })).filter(b => b.lyric && b.lyric.length > 0);
  const hl = (tick: number) => { let last = null as any; for (const s of syl) { if (s.tick <= tick) last = s; else break; } return last; };
  const bar1 = (bar: number) => beats.find(b => b.bar === bar)!.tick;
  const r14 = hl(bar1(14))?.lyric, r69 = hl(bar1(69))?.lyric, r102 = hl(bar1(102));
  console.log(`skipEmpty=${skipEmpty} skipTies=${skipTies}: bar14="${r14}" (want be) | bar69="${r69}" (want this?) | bar102="${r102?.lyric}"@bar${r102?.bar} (want -ground held from earlier bar)`);
}
for (const se of [false, true]) for (const st of [false, true]) run(se, st);
