import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScore, extractSyllablesFromRawLine } from './gp-parser.js';
import { readRawLyricsLine } from './line-breaks.js';
import { extractLyrics } from './extract-lyrics.js';

// Real catalog content is gitignored; skip when absent (e.g. CI).
const TIRO_GP = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp',
);
const hasTiro = fs.existsSync(TIRO_GP);

function bar1Tick(score: ReturnType<typeof loadScore>, trackIndex: number, bar: number): number {
  return score.tracks[trackIndex].staves[0].bars[bar - 1].voices[0].beats[0].absolutePlaybackStart;
}

describe.skipIf(!hasTiro)('extractSyllablesFromRawLine on TIRO (GP-semantics dispatch)', () => {
  it('places the three ground-truth syllables correctly', () => {
    const score = loadScore(TIRO_GP);
    const raw = readRawLyricsLine(TIRO_GP, 1)!;
    const syllables = extractSyllablesFromRawLine(score, 1, raw.text);

    const at = (tick: number) => {
      let last: (typeof syllables)[number] | null = null;
      for (const s of syllables) {
        if (s.tickPosition <= tick) last = s;
        else break;
      }
      return last;
    };

    expect(at(bar1Tick(score, 1, 14))?.text).toBe('be');
    expect(at(bar1Tick(score, 1, 69))?.text).toBe('this?');
    // Bar 102 beat 1 carries no syllable of its own — "ground" (bar 101) holds.
    const t102 = bar1Tick(score, 1, 102);
    expect(syllables.some((s) => s.tickPosition === t102)).toBe(false);
    expect(at(t102)?.text).toBe('ground');
  });
});

describe.skipIf(!hasTiro)('extractLyrics generates a dispatch-corrected .lrc for TIRO', () => {
  it('places the "be" and "this?" lines at the corrected times', async () => {
    const catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tiro-lrc-'));
    await extractLyrics(TIRO_GP, catalogRoot);

    const songDir = fs.readdirSync(catalogRoot)[0];
    const meta = JSON.parse(fs.readFileSync(path.join(catalogRoot, songDir, 'meta.json'), 'utf8'));
    expect(typeof meta.lyricsRawLine).toBe('string');

    const lrc = fs.readFileSync(path.join(catalogRoot, songDir, 'lyrics.lrc'), 'utf8');
    // Dispatch-corrected timings (verified against GP's own playback this
    // session): "You will be the death of me" starts at 00:29.05 (previously
    // drifted), and the first "how did it come to this?" line's last
    // syllable "this?" lands at bar 69 beat 1 (~02:22.4), giving the line
    // its corrected start.
    const lines = lrc.split('\n');
    const beLine = lines.find((l) => l.includes('you will be the death of'));
    const thisLine = lines.find((l) => l.includes('come to this?'));
    expect(beLine).toBeDefined();
    expect(thisLine).toBeDefined();

    // Ground truth cross-check computed from the score itself: the line
    // containing "be" must start no later than bar 14 beat 1's time, and
    // the "this?" line's end-gap timestamp must equal bar 69 beat 1's time.
    const { buildTickToMs } = await import('./gp-parser.js');
    const score = loadScore(TIRO_GP);
    const tickToMs = buildTickToMs(score);
    const fmt = (ms: number) => {
      const total = ms / 1000;
      const m = Math.floor(total / 60);
      return `${String(m).padStart(2, '0')}:${(total - m * 60).toFixed(2).padStart(5, '0')}`;
    };

    const thisEnd = fmt(tickToMs(bar1Tick(score, 1, 69)));
    const thisIdx = lines.indexOf(thisLine!);
    expect(lines[thisIdx + 1]).toBe(`[${thisEnd}]`);

    const beMs = tickToMs(bar1Tick(score, 1, 14));
    const beStartMs = parseTimestamp(beLine!);
    expect(beStartMs).toBeLessThanOrEqual(beMs);
    // ...and within the same line's span, not a bar early.
    expect(beMs - beStartMs).toBeLessThan(10_000);
  });
});

function parseTimestamp(lrcLine: string): number {
  const m = lrcLine.match(/^\[(\d+):(\d+\.\d+)\]/)!;
  return (Number(m[1]) * 60 + Number(m[2])) * 1000;
}
