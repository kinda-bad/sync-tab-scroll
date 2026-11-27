import { describe, expect, it } from 'vitest';
import { cleanRawLyricLine, lyricLineDisplayText } from './lyric-line-text';

describe('cleanRawLyricLine', () => {
  it('drops standalone + holds, including a long run of them', () => {
    expect(cleanRawLyricLine('But I\'m a + creep, I\'m a + weir-do + +')).toBe("But I'm a creep, I'm a weirdo");
    expect(cleanRawLyricLine(`Sink-ing in-to sweet un-cer-tain-ty${' +'.repeat(40)}`)).toBe('Sinking into sweet uncertainty');
    expect(cleanRawLyricLine('+ She\'s ru-un-ning out')).toBe("She's ruunning out");
  });

  it('reads a + joining two words as a space (alphaTab maps + to a space)', () => {
    expect(cleanRawLyricLine('(Tell me what do I+need?)')).toBe('(Tell me what do I need?)');
    expect(cleanRawLyricLine('And+I\'m+still run-ning a-way')).toBe("And I'm still running away");
  });

  it('joins hyphenated syllables back into words', () => {
    expect(cleanRawLyricLine('My dir-ty lit-tle se-cre-t')).toBe('My dirty little secret');
  });

  it('leaves ordinary text alone', () => {
    expect(cleanRawLyricLine('Hello there')).toBe('Hello there');
  });
});

describe('lyricLineDisplayText', () => {
  const rawLine = 'I want a per-fect bo-dy + +\nI want a per-fect soul';

  it('cleans a tab-sourced line whose text is the raw GP line (multi-line raw lyrics)', () => {
    const song = { lyricsTrackIndex: 0, lyricsRawLine: rawLine };
    expect(lyricLineDisplayText(song, 'I want a per-fect bo-dy + +')).toBe('I want a perfect body');
  });

  it('leaves lrclib text alone: an lrclib-sourced .lrc, or a tab song whose line text came from lrclib', () => {
    expect(lyricLineDisplayText({ lyricsTrackIndex: null, lyricsRawLine: undefined }, 'ex-girlfriend')).toBe('ex-girlfriend');
    // Single-line raw lyrics: the pipeline took line text from lrclib instead.
    expect(lyricLineDisplayText({ lyricsTrackIndex: 0, lyricsRawLine: 'one two three' }, 'ex-girlfriend')).toBe('ex-girlfriend');
    expect(lyricLineDisplayText({ lyricsTrackIndex: 0, lyricsRawLine: undefined }, 'ex-girlfriend')).toBe('ex-girlfriend');
  });
});
