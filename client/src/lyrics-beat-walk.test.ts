import { describe, expect, it } from 'vitest';
import { groupIntoLines, walkLyricBeats, walkLyricBeatsFromRawLine } from './lyrics-beat-walk';

// T004 (tasks-7f0f-4f2d.md, feedback F001): `absolutePlaybackStart` is a
// distinct alphaTab-computed value from `masterBar.start + playbackStart` —
// per alphaTab's own doc comment on `Beat.playbackStart`/`displayStart`:
// "This might differ from the actual playback time due to special grace
// types." A beat preceded by grace notes plays later, in real time, than
// its bar-relative `playbackStart` alone would suggest; `masterBar.start`
// is a *display*-timeline bar offset, not a playback one. The fake beats
// below default `absolutePlaybackStart` to `masterBar.start + playbackStart`
// (the common case, no grace notes) unless a divergent value is passed
// explicitly, so most tests don't need to care about the distinction.
function fakeBeat(
  lyrics: (string | undefined)[],
  playbackStart: number,
  absolutePlaybackStart = playbackStart,
  notes: { isTieDestination: boolean }[] = [],
) {
  return { lyrics, playbackStart, absolutePlaybackStart, notes };
}

function fakeScore(tracks: { staves: { bars: { masterBar: { start: number }; voices: { beats: ReturnType<typeof fakeBeat>[] }[] }[] }[] }[]) {
  return { tracks } as unknown as Parameters<typeof walkLyricBeats>[0];
}

describe('walkLyricBeats', () => {
  it('emits one syllable per beat with tickPosition = beat.absolutePlaybackStart', () => {
    const score = fakeScore([
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 1000 },
                voices: [{ beats: [fakeBeat(['la'], 10, 1010), fakeBeat(['di'], 20, 1020)] }],
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

  // Tie-aware dedup (T004, shared walk consolidation): same-text alone is
  // no longer sufficient to collapse a beat — the second/third+ beat must
  // also be a tie continuation (`beat.notes.some(n => n.isTieDestination)`),
  // matching a genuine sustained/melisma syllable. Same-text-only collapse
  // was the old (buggy) behavior — it wrongly collapsed genuinely-repeated
  // distinct syllables (see the next test).
  it('collapses consecutive beats sharing identical lyric text AND a tie relationship into one syllable, keeping the first tick', () => {
    const score = fakeScore([
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 0 },
                voices: [
                  {
                    beats: [
                      fakeBeat(['o-'], 0, 0, [{ isTieDestination: false }]),
                      fakeBeat(['o-'], 5, 5, [{ isTieDestination: true }]),
                      fakeBeat(['o-'], 10, 10, [{ isTieDestination: true }]),
                      fakeBeat(['ver'], 15, 15, [{ isTieDestination: false }]),
                    ],
                  },
                ],
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

  // T004/F003: same-text beats with NO tie relationship must remain
  // distinct syllables — e.g. "yeah, yeah, yeah" sung as three separate
  // notes. The old same-text-only dedup wrongly collapsed this case.
  it('keeps consecutive beats sharing identical lyric text as distinct syllables when there is no tie relationship', () => {
    const score = fakeScore([
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 0 },
                voices: [
                  {
                    beats: [
                      fakeBeat(['yeah'], 0, 0, [{ isTieDestination: false }]),
                      fakeBeat(['yeah'], 5, 5, [{ isTieDestination: false }]),
                      fakeBeat(['yeah'], 10, 10, [{ isTieDestination: false }]),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    expect(walkLyricBeats(score, 0, 0)).toEqual([
      { text: 'yeah', tickPosition: 0 },
      { text: 'yeah', tickPosition: 5 },
      { text: 'yeah', tickPosition: 10 },
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

  // Regression test for feedback F001's "~2-syllable-ahead" symptom:
  // previously `tickPosition` was computed as `masterBar.start +
  // beat.playbackStart` — a *display*-timeline reconstruction that ignores
  // grace-note timing shifts alphaTab itself already accounts for in
  // `absolutePlaybackStart`. A beat preceded by grace notes plays later in
  // real audio time than its bar-relative `playbackStart` alone implies,
  // so the old formula under-counted the tick, activating each following
  // syllable early relative to real playback — exactly the "ahead of the
  // audio" symptom. Each of these 4 beats is preceded by grace notes
  // consuming 2 ticks apiece, so `absolutePlaybackStart` runs increasingly
  // further ahead of `masterBar.start + playbackStart` as the bar
  // progresses (the previously-observed off-by-~2 drift, compounding).
  it('uses beat.absolutePlaybackStart, not masterBar.start + playbackStart, when grace notes make them diverge', () => {
    const score = fakeScore([
      {
        staves: [
          {
            bars: [
              {
                masterBar: { start: 1000 },
                voices: [
                  {
                    beats: [
                      fakeBeat(['one'], 0, 1002),
                      fakeBeat(['two'], 10, 1014),
                      fakeBeat(['three'], 20, 1026),
                      fakeBeat(['four'], 30, 1038),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    expect(walkLyricBeats(score, 0, 0)).toEqual([
      { text: 'one', tickPosition: 1002 },
      { text: 'two', tickPosition: 1014 },
      { text: 'three', tickPosition: 1026 },
      { text: 'four', tickPosition: 1038 },
    ]);
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

describe('walkLyricBeatsFromRawLine', () => {
  // Fake beats for the dispatch path carry isRest + tie flags; the raw line
  // is chunked by alphaTab's real `at.model.Lyrics` chunker (never
  // reimplemented) and dispatched with GP semantics via the shared
  // `dispatchLyrics` (feedback F001).
  function dispatchBeat(absolutePlaybackStart: number, opts: { rest?: boolean; tie?: boolean } = {}) {
    return {
      lyrics: null,
      playbackStart: absolutePlaybackStart,
      absolutePlaybackStart,
      isRest: opts.rest ?? false,
      notes: opts.tie ? [{ isTieDestination: true }] : [{ isTieDestination: false }],
    };
  }

  function dispatchScore(beats: ReturnType<typeof dispatchBeat>[]) {
    return {
      tracks: [{ staves: [{ bars: [{ masterBar: { start: 0 }, voices: [{ beats }] }] }] }],
    } as unknown as Parameters<typeof walkLyricBeats>[0];
  }

  it('lands non-empty chunks on singable beats, skipping rests and tie destinations', () => {
    const score = dispatchScore([
      dispatchBeat(0),
      dispatchBeat(10, { rest: true }),
      dispatchBeat(20, { tie: true }),
      dispatchBeat(30),
    ]);

    expect(walkLyricBeatsFromRawLine(score, 0, 'hel-lo world')).toEqual([
      { text: 'hel-', tickPosition: 0 },
      { text: 'lo', tickPosition: 30 },
    ]);
  });

  it('burns an empty chunk (double space, GP convention) on the very next beat of any kind', () => {
    // "one  two": the double space becomes an empty chunk that consumes
    // exactly one beat — here the tie-destination beat — so "two" lands on
    // the beat after it.
    const score = dispatchScore([dispatchBeat(0), dispatchBeat(10, { tie: true }), dispatchBeat(20), dispatchBeat(30)]);

    expect(walkLyricBeatsFromRawLine(score, 0, 'one  two')).toEqual([
      { text: 'one', tickPosition: 0 },
      { text: 'two', tickPosition: 20 },
    ]);
  });
});
