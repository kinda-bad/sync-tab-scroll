import fs from 'node:fs'; import path from 'node:path';
import { loadScore } from '../../packages/pipeline/src/gp-parser.ts';
const d = process.argv[2]; const gp = fs.readdirSync(d).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!;
const s = loadScore(path.join(d, gp));
for (const t of s.tracks) {
  let first: string | null = null;
  for (const st of t.staves) for (const bar of st.bars) {
    for (const v of bar.voices) for (const b of v.beats) if (!b.isRest && b.notes.length && first === null) first = `bar ${bar.index + 1} beat-tick ${b.playbackStart}`;
    if (first) break;
  }
  console.log(`  ${t.name}: ${first}`);
}
