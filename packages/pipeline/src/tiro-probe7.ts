import { loadScore } from './gp-parser.js';
import * as at from '@coderline/alphatab';
import AdmZip from 'adm-zip';

const GP = '../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp';
const xml = new AdmZip(GP).readAsText('Content/score.gpif');
const raw = [...xml.matchAll(/<Lyrics dispatched="true">([\s\S]*?)<\/Lyrics>/g)]
  .flatMap(mm => [...mm[1].matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map(c => c[1]))
  .filter(t => t.trim().length > 0).sort((a, b) => b.length - a.length)[0];
const ly = new at.model.Lyrics(); ly.text = raw; (ly as any).finish(false);
const chunks: string[] = (ly as any).chunks;

const score = loadScore(GP);
const t = score.tracks[1];
const beats: { tick: number; bar: number; rest: boolean; tieDest: boolean }[] = [];
for (const st of t.staves) for (const bar of st.bars) for (const b of bar.voices[0].beats)
  beats.push({ tick: b.absolutePlaybackStart, bar: bar.index + 1, rest: b.isRest, tieDest: b.notes?.some(n => n.isTieDestination) ?? false });

// chunk-driven: empty chunk consumes exactly the next beat of ANY kind;
// non-empty chunk skips rests and tie destinations, lands on next singable beat.
const out: (string | null)[] = beats.map(() => null);
let bi = 0;
for (const chunk of chunks) {
  if (bi >= beats.length) break;
  if (chunk.length === 0) { bi++; continue; }
  while (bi < beats.length && (beats[bi].rest || beats[bi].tieDest)) bi++;
  if (bi >= beats.length) break;
  out[bi++] = chunk;
}
const syl = beats.map((b, i) => ({ ...b, lyric: out[i] })).filter(b => b.lyric);
const hl = (tick: number) => { let last = null as any; for (const s of syl) { if (s.tick <= tick) last = s; else break; } return last; };
const bar1 = (bar: number) => beats.find(b => b.bar === bar)!.tick;
console.log(`bar14="${hl(bar1(14))?.lyric}" want be | bar69="${hl(bar1(69))?.lyric}" want this? | bar102="${hl(bar1(102))?.lyric}"@bar${hl(bar1(102))?.bar} want -ground held`);
console.log('bars 66-70:', syl.filter(s => s.bar >= 66 && s.bar <= 70).map(s => `b${s.bar}"${s.lyric}"`).join(' '));
console.log('bars 99-103:', syl.filter(s => s.bar >= 99 && s.bar <= 103).map(s => `b${s.bar}"${s.lyric}"`).join(' '));
