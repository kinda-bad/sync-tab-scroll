import { describe, expect, it } from 'vitest';
import { alignLinesByTimestamp } from './line-breaks.js';
import type { Syllable } from './gp-parser.js';

describe('alignLinesByTimestamp', () => {
  const msToTick = (ms: number) => ms * 10; // simple linear stand-in for a real tempo map

  it('returns per-line syllable counts by nearest-tick boundary matching', () => {
    const syllables: Syllable[] = [
      { text: 'I', tickPosition: 0 },
      { text: 'am', tickPosition: 100 },
      { text: 'a', tickPosition: 200 },
      { text: 'creep', tickPosition: 300 },
      { text: 'I', tickPosition: 1000 },
      { text: 'am', tickPosition: 1100 },
      { text: 'a', tickPosition: 1200 },
      { text: 'weirdo', tickPosition: 1300 },
    ];
    const timedLines = [
      { text: 'I am a creep', tickMs: 0 },
      { text: 'I am a weirdo', tickMs: 100 },
    ];

    expect(alignLinesByTimestamp(syllables, timedLines, msToTick)).toEqual([4, 4]);
  });

  it('stays grounded in tick proximity, not text matching, when GP and lrclib line text disagree', () => {
    // GP's own syllable text: "You will be the death of me" (7 syllables).
    // lrclib's line text: "And you will be the death of me" (an extra
    // leading word GP's own lyrics don't have) — mirrors the real
    // mismatch from feedback-lyrics-timing-tiro-c741.md. The correct tick
    // for this line's boundary is still the nearest GP syllable tick to
    // the lrclib line's own timestamp, regardless of the wording mismatch.
    const syllables: Syllable[] = [
      { text: 'You', tickPosition: 0 },
      { text: 'will', tickPosition: 100 },
      { text: 'be', tickPosition: 200 },
      { text: 'the', tickPosition: 300 },
      { text: 'death', tickPosition: 400 },
      { text: 'of', tickPosition: 500 },
      { text: 'me', tickPosition: 600 },
      { text: 'Next', tickPosition: 700 },
      { text: 'line', tickPosition: 800 },
    ];
    // lrclib's line starts at ms=0 (tick 0, closest to syllable index 0),
    // second line starts at ms=71 -> tick 710 (closest to syllable index 7,
    // "Next").
    const timedLines = [
      { text: 'And you will be the death of me', tickMs: 0 },
      { text: 'Next line', tickMs: 71 },
    ];

    expect(alignLinesByTimestamp(syllables, timedLines, msToTick)).toEqual([7, 2]);
  });

  it('gives the last line whatever syllables remain', () => {
    const syllables: Syllable[] = [
      { text: 'a', tickPosition: 0 },
      { text: 'b', tickPosition: 10 },
      { text: 'c', tickPosition: 20 },
      { text: 'd', tickPosition: 30 },
      { text: 'e', tickPosition: 40 },
    ];
    const timedLines = [
      { text: 'a b', tickMs: 0 },
      { text: 'c d e', tickMs: 2 },
    ];

    expect(alignLinesByTimestamp(syllables, timedLines, msToTick)).toEqual([2, 3]);
  });
});
