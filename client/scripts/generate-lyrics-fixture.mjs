/**
 * Generates the GP-embedded-lyrics test fixture under
 * `client/test-fixtures/fixture-catalog/lyrics-in-tab/`.
 *
 * The other fixture songs carry no lyrics track (`lyricsTrackIndex: null`),
 * so the in-tab lyrics ticker (App.svelte's `lyricsTickerAvailable`) is
 * disabled for them. This song has one guitar track whose lyrics live in the
 * GP file itself, which is the only shape that enables the ticker for an
 * instrument part.
 *
 * `meta.json`'s lyric fields derive from `LINES` below, the same text that is
 * written into the score, so the two cannot drift apart.
 *
 * Run: `node scripts/generate-lyrics-fixture.mjs` from `client/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as at from '@coderline/alphatab';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'test-fixtures', 'fixture-catalog', 'lyrics-in-tab');

const BPM = 120;
/** One syllable per quarter note, one line per bar. */
const LINES = [
  ['one', 'two', 'three', 'four'],
  ['five', 'six', 'sev', 'en'],
  ['eight', 'nine', 'ten', 'more'],
  ['and', 'then', 'we', 'stop'],
];

const rawLine = LINES.map((line) => line.join(' ')).join(' ');
const bar = '3.3.4 3.3.4 3.3.4 3.3.4';
const tex = `\\title "Lyrics In Tab Fixture"\n\\tempo ${BPM}\n.\n\\lyrics "${rawLine}"\n${Array(LINES.length).fill(bar).join(' | ')}`;

const importer = new at.importer.AlphaTexImporter();
importer.initFromString(tex, new at.Settings());
const score = importer.readScore();
const gp = new at.exporter.Gp7Exporter().export(score, new at.Settings());

const meta = {
  name: 'Lyrics In Tab Song',
  artist: 'Test Fixtures',
  parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
  lyricsTrackIndex: 0,
  lyricsLineIndex: 0,
  lyricLineBreaks: LINES.map((line) => line.length),
  lyricsRawLine: rawLine,
};

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'lyrics-in-tab.gp'), gp);
fs.writeFileSync(path.join(DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
console.log(`wrote ${DIR}`);
