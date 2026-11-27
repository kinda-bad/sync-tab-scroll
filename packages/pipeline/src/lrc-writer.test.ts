import * as at from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { buildLrc } from './lrc-writer.js';
import { buildPlaybackOrder, buildTickToMs, extractSyllablesFromRawLine } from './gp-parser.js';

/** 120bpm: one 4/4 bar is exactly 2s, so playback position reads straight off the timestamps. */
function scoreFromTex(tex: string): at.model.Score {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(tex, settings);
  return importer.readScore();
}

describe('buildLrc', () => {
  it('writes one start + gap entry per line for a score without repeats', () => {
    const score = scoreFromTex(`\\tempo 120\n.\n\\track "V"\n\\ts 4 4 0.4.1 | 0.4.1 | 0.4.1`);
    const syllables = extractSyllablesFromRawLine(score, 0, 'one two three');
    const lrc = buildLrc(['one', 'two three'], [1, 2], syllables, buildPlaybackOrder(score), buildTickToMs(score));
    expect(lrc).toBe('[00:00.00]one\n[00:00.00]\n[00:02.00]two three\n[00:04.00]\n');
  });

  it('places lines after a repeat on the playback timeline and repeats the repeated lines', () => {
    // 1 |: 2 | 3 (ending 1) :| 4 (ending 2) → played 1 2 3 2 4.
    const score = scoreFromTex(
      `\\tempo 120\n.\n\\track "V"\n\\ts 4 4 0.4.1 | \\ro 0.4.1 | \\ae 1 \\rc 2 0.4.1 | \\ae 2 0.4.1`,
    );
    const syllables = extractSyllablesFromRawLine(score, 0, 'intro keep secret after');
    const lrc = buildLrc(['intro', 'keep secret', 'after'], [1, 2, 1], syllables, buildPlaybackOrder(score), buildTickToMs(score));
    expect(lrc).toBe(
      [
        '[00:00.00]intro',
        '[00:00.00]',
        '[00:02.00]keep secret', // bars 2–3, first pass
        '[00:04.00]',
        '[00:06.00]keep secret', // bar 2 again (second pass skips ending 1)
        '[00:06.00]',
        '[00:08.00]after', // bar 4: 8s, not the written 6s
        '[00:08.00]',
        '',
      ].join('\n'),
    );
  });

  it('restarts a line when playback jumps back inside it', () => {
    // A repeat entirely inside one line: |: 1 :| x2 → the line is sung twice.
    const score = scoreFromTex(`\\tempo 120\n.\n\\track "V"\n\\ts 4 4 \\ro \\rc 2 0.4.4 0.4.4`);
    const syllables = extractSyllablesFromRawLine(score, 0, 'la di');
    const lrc = buildLrc(['la di'], [2], syllables, buildPlaybackOrder(score), buildTickToMs(score));
    expect(lrc).toBe('[00:00.00]la di\n[00:00.50]\n[00:02.00]la di\n[00:02.50]\n');
  });
});
