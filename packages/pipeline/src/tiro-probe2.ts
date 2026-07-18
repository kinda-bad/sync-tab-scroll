import { loadScore } from './gp-parser.js';
const score = loadScore('../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp');
const t = score.tracks[1];
// raw lyric lines stored on the score/track
console.log('score.lyrics?', (score as any).lyrics?.length);
for (const st of t.staves) {
  for (const bar of st.bars.slice(11, 15)) {
    console.log(`== bar ${bar.index + 1} (masterBar.start ${bar.masterBar.start}, ts ${bar.masterBar.timeSignatureNumerator}/${bar.masterBar.timeSignatureDenominator})`);
    for (const v of bar.voices) for (const b of v.beats) {
      console.log(`  tick=${b.absolutePlaybackStart} dur=${b.playbackDuration} rest=${b.isRest} tieDest=${b.notes?.some(n=>n.isTieDestination)} lyric=${JSON.stringify(b.lyrics?.[0] ?? null)}`);
    }
  }
}
const raw = (t as any).lyrics ?? (score as any).lyrics;
if (raw) for (const l of raw) console.log('RAW lyric line, startBar', l.startBar, JSON.stringify(l.text).slice(0, 600));
