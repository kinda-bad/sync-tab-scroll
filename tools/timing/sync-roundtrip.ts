/** Usage: sync-roundtrip.ts <songDir> <syncPoints.json>  -> applies the points
 * with alphaTab's Score.applyFlatSyncPoints and exports them back, to confirm
 * alphaTab accepts every point (barIndex/barOccurence/barPosition) unchanged. */
import fs from 'node:fs'; import path from 'node:path';
import { loadScore } from '../../packages/pipeline/src/gp-parser.ts';
const [d, f] = process.argv.slice(2);
const gp = fs.readdirSync(d).find((x) => x.endsWith('.gp') && !x.startsWith('._'))!;
const s = loadScore(path.join(d, gp)); const sp = JSON.parse(fs.readFileSync(f, 'utf8')).syncPoints;
s.applyFlatSyncPoints(sp); const out = s.exportFlatSyncPoints();
const key = (p: any) => `${p.barIndex}/${p.barOccurence}/${p.barPosition}/${p.millisecondOffset}`;
console.log(`in ${sp.length} out ${out.length} identical=${JSON.stringify(sp.map(key)) === JSON.stringify(out.map(key))}`);
if (JSON.stringify(sp.map(key)) !== JSON.stringify(out.map(key))) console.log(out.map(key).join(' '));
