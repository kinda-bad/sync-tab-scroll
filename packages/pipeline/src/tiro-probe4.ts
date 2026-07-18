import { loadScore } from './gp-parser.js';
import AdmZip from 'adm-zip';

const GP = '../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp';
const xml = new AdmZip(GP).readAsText('Content/score.gpif');
const m = xml.match(/<Track>[\s\S]*?<\/Track>/g)!;
// track 1 lyric line (vocals). Grab all track-level Lyrics Line Texts, pick the long one.
const lines = [...xml.matchAll(/<Lyrics dispatched="true">([\s\S]*?)<\/Lyrics>/g)]
  .flatMap(mm => [...mm[1].matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map(c => c[1]))
  .filter(t => t.trim().length > 0);
const raw = lines.sort((a, b) => b.length - a.length)[0];
console.log('raw line length', raw.length);

const score = loadScore(GP);
const t = score.tracks[1];
const beats: { tick: number; bar: number; rest: boolean; tieDest: boolean; atLyric: string | null }[] = [];
for (const st of t.staves) for (const bar of st.bars) for (const b of bar.voices[0].beats)
  beats.push({ tick: b.absolutePlaybackStart, bar: bar.index + 1, rest: b.isRest, tieDest: b.notes?.some(n => n.isTieDestination) ?? false, atLyric: b.lyrics?.[0] ?? null });

// GP-style tokenization: a syllable ends at '-' (kept), ' ' or newline (dropped).
// '+' = extend previous syllable onto this beat (consumes a beat, no new text).
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      if (cur) { tokens.push(cur); cur = ''; }
    } else if (ch === '-') {
      cur += '-'; tokens.push(cur); cur = '';
    } else cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}
const tokens = tokenize(raw);
console.log('token count', tokens.length, '| playable beats (non-rest, non-tieDest):', beats.filter(b => !b.rest && !b.tieDest).length, '| alphaTab lyric beats:', beats.filter(b => b.atLyric).length);

// dispatch: skip rests AND tie destinations; '+' consumes a beat silently
function dispatch(skipTies: boolean) {
  const out = new Map<number, string>(); // beat array index -> text
  let ti = 0;
  beats.forEach((b, i) => {
    if (b.rest) return;
    if (skipTies && b.tieDest) return;
    if (ti >= tokens.length) return;
    const tok = tokens[ti++];
    if (tok !== '+') out.set(i, tok);
  });
  return out;
}
for (const skipTies of [true, false]) {
  const d = dispatch(skipTies);
  const syl = beats.map((b, i) => ({ ...b, lyric: d.get(i) ?? null })).filter(b => b.lyric);
  const at = (tick: number) => { let last = null as any; for (const s of syl) { if (s.tick <= tick) last = s; else break; } return last; };
  console.log(`\n== skipTies=${skipTies}`);
  for (const [bar, tick, want] of [[14, 49920, 'be'], [69, 261120, 'this?'], [102, null, 'underground (held)']] as any) {
    const tk = tick ?? beats.find(b => b.bar === bar)!.tick;
    const s = at(tk);
    console.log(`bar ${bar} beat1 tick ${tk}: highlights "${s?.lyric}" (from bar ${s?.bar}) — want ${want}`);
  }
  console.log('bar 69 syllables:', syl.filter(s => s.bar === 69).map(s => `"${s.lyric}"@${s.tick}`).join(' '));
  console.log('bars 101-103 syllables:', syl.filter(s => s.bar >= 101 && s.bar <= 103).map(s => `bar${s.bar}"${s.lyric}"`).join(' '));
}
