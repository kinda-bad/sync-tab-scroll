// Usage: tempomap.ts <songDir>  -> tempo changes, time-signature changes, total ticks, notated (synth) end ms, and per-bar synth ms (JSON on last line)
import fs from 'node:fs'; import path from 'node:path';
import { loadScore, buildTickToMs } from '../../packages/pipeline/src/gp-parser.ts';
const d = process.argv[2]; const gp = fs.readdirSync(d).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!;
const s = loadScore(path.join(d, gp)); const t2ms = buildTickToMs(s);
const barStart: number[] = []; let cum = 0; let ts = ''; const tsChanges: string[] = []; const tempo: string[] = [];
for (const mb of s.masterBars) {
  barStart.push(cum);
  const sig = `${mb.timeSignatureNumerator}/${mb.timeSignatureDenominator}`;
  if (sig !== ts) { tsChanges.push(`bar ${mb.index + 1}: ${sig}`); ts = sig; }
  for (const a of mb.tempoAutomations ?? []) tempo.push(`bar ${mb.index + 1}@${a.ratioPosition}: ${a.value}`);
  if (mb.isRepeatStart || mb.repeatCount > 0 || mb.alternateEndings) tsChanges.push(`  repeat marker bar ${mb.index + 1} start=${mb.isRepeatStart} count=${mb.repeatCount} alt=${mb.alternateEndings}`);
  cum += mb.calculateDuration();
}
console.log(`bars=${s.masterBars.length} totalTicks=${cum} synthEndMs=${t2ms(cum).toFixed(0)} score.tempo=${s.tempo}`);
console.log('time sigs:', tsChanges.join(' | ')); console.log('tempo:', tempo.join(' | '));
console.log(JSON.stringify({ barStart: [...barStart, cum], barMs: [...barStart, cum].map((t) => Math.round(t2ms(t))) }));
