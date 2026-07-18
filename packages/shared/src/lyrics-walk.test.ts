import { describe, expect, it } from 'vitest';
import { walkSyllables } from './lyrics-walk';

// fakeBeat mirrors the real alphaTab Beat/Note shape enough for the walk:
// `notes` carries `isTieDestination` per note, `lyrics` is indexed by
// line/channel, and `absolutePlaybackStart` is the tick source.
function fakeBeat(lyrics: (string | undefined)[], absolutePlaybackStart: number, notes: { isTieDestination: boolean }[] = []) {
  return { lyrics, absolutePlaybackStart, notes };
}

function fakeScore(beats: ReturnType<typeof fakeBeat>[]) {
  return {
    tracks: [
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 0 },
                voices: [{ beats }],
              },
            ],
          },
        ],
      },
    ],
  } as unknown as Parameters<typeof walkSyllables>[0];
}

describe('walkSyllables', () => {
  it('collapses same-text consecutive beats into one syllable when the second beat is a tie destination', () => {
    const score = fakeScore([
      fakeBeat(['yeah'], 0, [{ isTieDestination: false }]),
      fakeBeat(['yeah'], 10, [{ isTieDestination: true }]),
    ]);

    expect(walkSyllables(score, { trackIndex: 0, lineIndex: 0 })).toEqual([{ text: 'yeah', tickPosition: 0 }]);
  });

  it('keeps same-text consecutive beats as two distinct syllables when there is no tie relationship', () => {
    const score = fakeScore([
      fakeBeat(['yeah'], 0, [{ isTieDestination: false }]),
      fakeBeat(['yeah'], 10, [{ isTieDestination: false }]),
    ]);

    expect(walkSyllables(score, { trackIndex: 0, lineIndex: 0 })).toEqual([
      { text: 'yeah', tickPosition: 0 },
      { text: 'yeah', tickPosition: 10 },
    ]);
  });

  it('gives the next syllable its own tickPosition when a tie-destination breath beat with no lyric text precedes it across a barline (TIRO measure 8/9 repro)', () => {
    const score = fakeScore([
      // Measure 8's last note: tie destination, breath, no lyric text of its own.
      fakeBeat([undefined], 100, [{ isTieDestination: true }]),
      // Measure 9's first note: carries the next lyric, not a tie destination.
      fakeBeat(["You're"], 120, [{ isTieDestination: false }]),
    ]);

    expect(walkSyllables(score, { trackIndex: 0, lineIndex: 0 })).toEqual([{ text: "You're", tickPosition: 120 }]);
  });
});
