import { describe, expect, it } from 'vitest';
import { parseLrc } from './lrc-parser';

describe('parseLrc', () => {
  it('parses a normal timestamped line', () => {
    expect(parseLrc('[00:12.34]some lyric')).toEqual([{ timeMs: 12340, text: 'some lyric' }]);
  });

  it('parses a blank gap line as an empty-text line', () => {
    expect(parseLrc('[00:15.00]')).toEqual([{ timeMs: 15000, text: '' }]);
  });

  it('skips lines that do not match the bracket timestamp pattern', () => {
    expect(parseLrc('not a lyric line\n[bad]also not one')).toEqual([]);
  });

  it('preserves order across multiple lines', () => {
    const content = '[00:01.00]first\n[00:02.50]second\n[01:00.00]third';
    expect(parseLrc(content)).toEqual([
      { timeMs: 1000, text: 'first' },
      { timeMs: 2500, text: 'second' },
      { timeMs: 60000, text: 'third' },
    ]);
  });
});
