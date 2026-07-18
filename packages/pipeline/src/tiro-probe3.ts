import { loadScore } from './gp-parser.js';
const score = loadScore('../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp');
const t = score.tracks[1];
// flat beat list, voice 0
const beats: { tick: number; bar: number; rest: boolean; tieDest: boolean; lyric: string | null }[] = [];
for (const st of t.staves) for (const bar of st.bars) for (const b of bar.voices[0].beats)
  beats.push({ tick: b.absolutePlaybackStart, bar: bar.index + 1, rest: b.isRest, tieDest: b.notes?.some(n => n.isTieDestination) ?? false, lyric: b.lyrics?.[0] ?? null });

const tieWithLyric = beats.filter(b => b.tieDest && b.lyric);
console.log('lyric-bearing tieDest beats:', tieWithLyric.map(b => `bar${b.bar}@${b.tick}:"${b.lyric}"`).join(' '));

// GP-style re-dispatch: chunk raw text like alphaTab does, but skip tie destinations too
const raw = (t as any).lyrics?.[0]?.text ?? null;
console.log('track.lyrics present?', !!(t as any).lyrics, (t as any).lyrics?.length);
// alphaTab already chunked into beats; recover chunk sequence in order:
const chunks = beats.filter(b => b.lyric).map(b => b.lyric as string);
// re-dispatch skipping rests AND tieDests
const playable = beats.filter(b => !b.rest && !b.tieDest);
const redisp = playable.map((b, i) => ({ ...b, lyric: chunks[i] ?? null }));
const at49920 = redisp.filter(b => b.bar === 14);
console.log('GP-style bar 14:', at49920.map(b => `"${b.lyric}"@${b.tick}`).join(' '));
console.log('alphaTab bar 14:', beats.filter(b => b.bar === 14 && b.lyric).map(b => `"${b.lyric}"@${b.tick}`).join(' '));
console.log('GP-style bar 69:', redisp.filter(b => b.bar === 69 && b.lyric).map(b => `"${b.lyric}"@${b.tick}`).join(' '));
console.log('alphaTab bar 69:', beats.filter(b => b.bar === 69 && b.lyric).map(b => `"${b.lyric}"@${b.tick}`).join(' '));
console.log('tieDest-with-lyric count before bar 14:', tieWithLyric.filter(b => b.bar < 14).length);
console.log('tieDest-with-lyric count before bar 69:', tieWithLyric.filter(b => b.bar < 69).length);
