// Builds the Sweetness Lead Vocals raw lyric line from the song's own lyrics.lrc.
// Usage: node sweetness-build-raw-line.mjs <lyrics.lrc> <out raw-line.txt>
// The lyric text is never hard-coded here: it is read from the LRC, syllabified with
// HYPHENATE, then adjusted per LRC file line (1-based) by SPEC to fit the tab's notes.
import fs from 'node:fs';
const [lrcPath, outPath] = process.argv.slice(2);

const HYPHENATE = {
  listening: 'lis-ten-ing', tether: 'teth-er', unwinds: 'un-winds', outward: 'out-ward',
  spinning: 'spin-ning', little: 'lit-tle', simple: 'sim-ple', numbing: 'numb-ing',
  meaning: 'mean-ing', stumble: 'stum-ble', sinking: 'sink-ing', into: 'in-to',
  uncertainty: 'un-cer-tain-ty', running: 'run-ning', away: 'a-way', dizzy: 'diz-zy',
  sweetness: 'sweet-ness', concerned: 'con-cerned',
};
const hyph = (tok) => {
  const m = tok.match(/^([^A-Za-z']*)([A-Za-z'-]+?)([^A-Za-z']*)$/);
  if (!m) return tok;
  const h = HYPHENATE[m[2].toLowerCase()];
  if (!h) return tok;
  // keep the original capitalization of the first letter
  const word = m[2][0] === m[2][0].toUpperCase() ? h[0].toUpperCase() + h.slice(1) : h;
  return m[1] + word + m[3];
};
const unhyph = (t) => t.replace(/-/g, '');
const holds = (n) => Array(n).fill('+');

// Per-LRC-line adjustments. Token indexes are 0-based word positions in the LRC line.
//  endHold  : append one `+` (a melisma/extra note at the end of the phrase)
//  tailHolds: append n `+` (instrumental/unlyricked vocal notes after the line)
//  merge    : [i, j] join words i..j into one chunk with `+` (sung on one note)
//  whole    : token index whose syllables collapse to one chunk (no hyphens)
//  lastSplit: token index whose word becomes first-syllable + rest (2 chunks)
const SPEC = {
  1: { endHold: 1 }, 2: { endHold: 1 },
  4: { whole: [-1] },
  6: { endHold: 1 },
  9: { endHold: 1 }, 11: { endHold: 1 }, 12: { endHold: 1 },
  14: { merge: [[-2, -1]] },
  17: { whole: [-1] },
  19: { endHold: 1 }, 21: { endHold: 1 },
  22: { tailHolds: 40 },           // bridge, bars 57-72: 8 x 5 vocal notes, no lyric in the LRC
  26: { lastSplit: [-1] },
  28: { whole: [-1] },
  29: { merge: [[0, 2]] },
  30: { whole: [-1] },
  31: { merge: [[1, 3]] }, 32: { merge: [[1, 3]] }, // lead "whoa" + "oh"; the untranscribed echo shares the "oh" note
  36: { endHold: 1 },
  37: { endHold: 1 },
  39: { endHold: 1, tailHolds: 3 }, // bar 105: three staccato notes with no lyric in the LRC
};

const fileLines = fs.readFileSync(lrcPath, 'utf8').split('\n');
const out = [];
fileLines.forEach((raw, idx) => {
  const n = idx + 1;
  const text = raw.replace(/^\[\d+:\d+\.\d+\]\s*/, '').trim();
  if (!text) return;
  const spec = SPEC[n] ?? {};
  let toks = text.split(/\s+/).map(hyph);
  const at = (i) => (i < 0 ? toks.length + i : i);
  for (const i of spec.whole ?? []) toks[at(i)] = unhyph(toks[at(i)]);
  for (const i of spec.lastSplit ?? []) {
    const t = unhyph(toks[at(i)]);
    const k = t.search(/[A-Za-z]/);
    // lis-tening: split after the first syllable as HYPHENATE gives it
    const first = toks[at(i)].split('-')[0];
    toks[at(i)] = first + '-' + t.slice(first.length);
  }
  for (const [a, b] of (spec.merge ?? []).map(([a, b]) => [at(a), at(b)]).sort((x, y) => y[0] - x[0])) {
    toks.splice(a, b - a + 1, toks.slice(a, b + 1).join('+'));
  }
  if (spec.endHold) toks.push(...holds(spec.endHold));
  if (spec.tailHolds) toks.push(...holds(spec.tailHolds));
  out.push(toks.join(' '));
});
fs.writeFileSync(outPath, out.join('\n'));
console.log(`wrote ${out.length} lines to ${outPath}`);
