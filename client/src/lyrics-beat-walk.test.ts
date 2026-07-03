import { describe, expect, it } from 'vitest';
import { groupIntoLines, walkLyricBeats } from './lyrics-beat-walk';

function fakeBeat(lyrics: (string | undefined)[], playbackStart: number) {
  return { lyrics, playbackStart };
}

function fakeScore(tracks: { staves: { bars: { masterBar: { start: number }; voices: { beats: ReturnType<typeof fakeBeat>[] }[] }[] }[] }[]) {
  return { tracks } as unknown as Parameters<typeof walkLyricBeats>[0];
}

describe('walkLyricBeats', () => {
  it('emits one syllable per beat with tickPosition = masterBar.start + beat.playbackStart', () => {
    const score = fakeScore([
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 1000 },
                voices: [{ beats: [fakeBeat(['la'], 10), fakeBeat(['di'], 20)] }],
              },
            ],
          },
        ],
      },
    ]);

    expect(walkLyricBeats(score, 0, 0)).toEqual([
      { text: 'la', tickPosition: 1010 },
      { text: 'di', tickPosition: 1020 },
    ]);
  });

  it('collapses consecutive beats sharing identical lyric text into one syllable, keeping the first tick', () => {
    const score = fakeScore([
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 0 },
                voices: [{ beats: [fakeBeat(['o-'], 0), fakeBeat(['o-'], 5), fakeBeat(['o-'], 10), fakeBeat(['ver'], 15)] }],
              },
            ],
          },
        ],
      },
    ]);

    expect(walkLyricBeats(score, 0, 0)).toEqual([
      { text: 'o-', tickPosition: 0 },
      { text: 'ver', tickPosition: 15 },
    ]);
  });

  it('selects the lyric channel indicated by lyricsLineIndex', () => {
    const score = fakeScore([
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 0 },
                voices: [{ beats: [fakeBeat(['primary', 'secondary'], 0)] }],
              },
            ],
          },
        ],
      },
    ]);

    expect(walkLyricBeats(score, 0, 1)).toEqual([{ text: 'secondary', tickPosition: 0 }]);
  });
});

describe('groupIntoLines', () => {
  it('regroups a flat syllable stream by lyricLineBreaks counts', () => {
    const syllables = [
      { text: 'a', tickPosition: 0 },
      { text: 'b', tickPosition: 1 },
      { text: 'c', tickPosition: 2 },
      { text: 'd', tickPosition: 3 },
      { text: 'e', tickPosition: 4 },
    ];

    expect(groupIntoLines(syllables, [2, 3])).toEqual([
      [syllables[0], syllables[1]],
      [syllables[2], syllables[3], syllables[4]],
    ]);
  });

  it('returns an empty array for an empty lyricLineBreaks input', () => {
    expect(groupIntoLines([{ text: 'a', tickPosition: 0 }], [])).toEqual([]);
  });
});
