import fs from 'node:fs'; import path from 'node:path';
import { loadScore } from '../../packages/pipeline/src/gp-parser.ts';
const d = process.argv[2]; const gp = fs.readdirSync(d).find((f) => f.endsWith('.gp') && !f.startsWith('._'))!;
const s = loadScore(path.join(d, gp)); console.log(s.tempo, s.masterBars[0].timeSignatureNumerator + '/' + s.masterBars[0].timeSignatureDenominator);
