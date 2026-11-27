import { describe, expect, it } from 'vitest';
import * as at from '@coderline/alphatab';
import { playbackOrderOf, unrollSyllables } from './lyrics-unroll';
import { walkSyllables } from './lyrics-walk';

const BAR = 3840; // one 4/4 bar at 960 ticks per quarter

/** A real alphaTab score from AlphaTex, plus the playback order alphaTab's own MIDI generator produces for it. */
function scoreFromTex(tex: string) {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(tex, settings);
  const score = importer.readScore();
  const generator = new at.midi.MidiFileGenerator(score, settings, new at.midi.AlphaSynthMidiFileHandler(new at.midi.MidiFile()));
  generator.generate();
  return { score, tickLookup: generator.tickLookup };
}

describe('playbackOrderOf', () => {
  it('lists each played bar in playback order, expanding a repeat', () => {
    // Bars 1 | 2 3 :|x2 | 4 → played 1 2 3 2 3 4
    const { score, tickLookup } = scoreFromTex(
      `\\track "V"\n\\ts 4 4 0.4 0.4 0.4 0.4 | \\ro 1.4 1.4 1.4 1.4 | \\rc 2 2.4 2.4 2.4 2.4 | 3.4 3.4 3.4 3.4`,
    );
    const order = playbackOrderOf(score, tickLookup);
    expect(order.masterBarStarts).toEqual([0, BAR, 2 * BAR, 3 * BAR]);
    expect(order.plays).toEqual([
      { masterBarIndex: 0, playbackStart: 0 },
      { masterBarIndex: 1, playbackStart: BAR },
      { masterBarIndex: 2, playbackStart: 2 * BAR },
      { masterBarIndex: 1, playbackStart: 3 * BAR },
      { masterBarIndex: 2, playbackStart: 4 * BAR },
      { masterBarIndex: 3, playbackStart: 5 * BAR },
    ]);
  });
});

describe('unrollSyllables', () => {
  it('is the identity (plus source indexes) for a score without repeats', () => {
    const syllables = [
      { text: 'a', tickPosition: 0 },
      { text: 'b', tickPosition: BAR + 960 },
    ];
    const plays = [
      { masterBarIndex: 0, playbackStart: 0 },
      { masterBarIndex: 1, playbackStart: BAR },
    ];
    expect(unrollSyllables(syllables, [0, BAR], plays)).toEqual([
      { text: 'a', tickPosition: 0, sourceIndex: 0 },
      { text: 'b', tickPosition: BAR + 960, sourceIndex: 1 },
    ]);
  });

  it("re-emits a repeated bar's syllables on each pass and shifts everything after the repeat", () => {
    const { score, tickLookup } = scoreFromTex(
      `\\track "V"\n\\lyrics "one two three four five six"\n` +
        `\\ts 4 4 0.4.2 0.4.2 | \\ro 1.4.2 1.4.2 | \\rc 2 2.4.2 2.4.2 | 3.4.2 3.4.2`,
    );
    const written = walkSyllables(score, { trackIndex: 0, lineIndex: 0 });
    // Written placement: bar 1 one/two, bar 2 three/four, bar 3 five/six, bar 4 none.
    expect(written.map((s) => s.tickPosition)).toEqual([0, 1920, BAR, BAR + 1920, 2 * BAR, 2 * BAR + 1920]);

    const order = playbackOrderOf(score, tickLookup);
    const placed = unrollSyllables(written, order.masterBarStarts, order.plays);
    expect(placed).toEqual([
      { text: 'one', tickPosition: 0, sourceIndex: 0 },
      { text: 'two', tickPosition: 1920, sourceIndex: 1 },
      { text: 'three', tickPosition: BAR, sourceIndex: 2 },
      { text: 'four', tickPosition: BAR + 1920, sourceIndex: 3 },
      { text: 'five', tickPosition: 2 * BAR, sourceIndex: 4 },
      { text: 'six', tickPosition: 2 * BAR + 1920, sourceIndex: 5 },
      // second pass of bars 2–3
      { text: 'three', tickPosition: 3 * BAR, sourceIndex: 2 },
      { text: 'four', tickPosition: 3 * BAR + 1920, sourceIndex: 3 },
      { text: 'five', tickPosition: 4 * BAR, sourceIndex: 4 },
      { text: 'six', tickPosition: 4 * BAR + 1920, sourceIndex: 5 },
    ]);
  });

  it('follows alternate endings: the first-ending bar is skipped on the second pass', () => {
    // 1 |: 2 | 3 (ending 1) :| 4 (ending 2) → played 1 2 3 2 4 (Dirty Little Secret's shape).
    const { score, tickLookup } = scoreFromTex(
      `\\track "V"\n\\lyrics "a b c d"\n` +
        `\\ts 4 4 0.1 | \\ro 1.1 | \\ae 1 \\rc 2 2.1 | \\ae 2 3.1`,
    );
    const written = walkSyllables(score, { trackIndex: 0, lineIndex: 0 });
    const order = playbackOrderOf(score, tickLookup);
    expect(order.plays.map((p) => p.masterBarIndex)).toEqual([0, 1, 2, 1, 3]);
    const placed = unrollSyllables(written, order.masterBarStarts, order.plays);
    expect(placed.map((s) => [s.text, s.tickPosition / BAR])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
      ['b', 3],
      ['d', 4],
    ]);
  });

  it('drops syllables of bars that are never played', () => {
    const syllables = [
      { text: 'kept', tickPosition: 0 },
      { text: 'skipped', tickPosition: BAR },
    ];
    expect(unrollSyllables(syllables, [0, BAR], [{ masterBarIndex: 0, playbackStart: 0 }])).toEqual([
      { text: 'kept', tickPosition: 0, sourceIndex: 0 },
    ]);
  });
});
