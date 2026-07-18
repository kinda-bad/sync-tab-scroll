import { loadScore } from './gp-parser.js';
import * as at from '@coderline/alphatab';
import AdmZip from 'adm-zip';

const GP = '../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp';
const xml = new AdmZip(GP).readAsText('Content/score.gpif');
const lines = [...xml.matchAll(/<Lyrics dispatched="true">([\s\S]*?)<\/Lyrics>/g)]
  .flatMap(mm => [...mm[1].matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map(c => c[1]))
  .filter(t => t.trim().length > 0);
const raw = lines.sort((a, b) => b.length - a.length)[0];

// alphaTab's own chunker, via its public model class
const ly = new at.model.Lyrics();
ly.text = raw;
(ly as any).finish(false);
const chunks: string[] = (ly as any).chunks;
console.log('chunk count', chunks.length, 'empty chunks:', chunks.filter(c => c.length === 0).length);

const score = loadScore(GP);
const t = score.tracks[1];
const beats: { tick: number; bar: number; rest: boolean; tieDest: boolean; atLyric: string | null }[] = [];
for (const st of t.staves) for (const bar of st.bars) for (const b of bar.voices[0].beats)
  beats.push({ tick: b.absolutePlaybackStart, bar: bar.index + 1, rest: b.isRest, tieDest: b.notes?.some(n => n.isTieDestination) ?? false, atLyric: b.lyrics?.[0] ?? null });

// GP-style: alphaTab applyLyrics but ALSO skip tie destinations
const out: (string | null)[] = beats.map(() => null);
let ci = 0;
for (let i = 0; i < beats.length && ci < chunks.length; i++) {
  const b = beats[i];
  if (b.rest || b.tieDest) continue;
  out[i] = chunks[ci++];
}
const syl = beats.map((b, i) => ({ ...b, lyric: out[i] })).filter(b => b.lyric && b.lyric.length > 0);
const at_ = (tick: number) => { let last = null as any; for (const s of syl) { if (s.tick <= tick) last = s; else break; } return last; };
const bar1 = (bar: number) => beats.find(b => b.bar === bar)!.tick;
for (const [bar, want] of [[14, 'be'], [69, 'this?'], [102, '(underground held)']] as [number, string][]) {
  const s = at_(bar1(bar));
  console.log(`bar ${bar} beat1: highlights "${s?.lyric}" (bar ${s?.bar}) — want ${want}`);
}
console.log('bars 66-70:', syl.filter(s => s.bar >= 66 && s.bar <= 70).map(s => `b${s.bar}"${s.lyric}"`).join(' '));
console.log('bars 99-103:', syl.filter(s => s.bar >= 99 && s.bar <= 103).map(s => `b${s.bar}"${s.lyric}"`).join(' '));
