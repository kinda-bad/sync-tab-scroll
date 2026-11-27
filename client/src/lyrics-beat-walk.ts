import * as at from '@coderline/alphatab';
import { walkSyllables, dispatchLyrics, type Syllable, type DispatchBeat } from '@sync-tab-scroll/shared';

export type { Syllable };

/**
 * Live beat-walk (infrastructure.md In-Tab Lyrics Overlay): walks the
 * lyrics-bearing track's beats in the already-loaded score and returns the
 * flat, ordered syllable stream — not a pipeline-published tick map
 * (constitution Principle V; datamodel.md Normalization Rules). Works
 * regardless of which track is currently rendered/viewed, since tick
 * position is score-global, not per-track.
 *
 * `Beat.lyrics` is indexed by lyric line/channel, not syllable (GP supports
 * multiple simultaneous lyric channels) — `lyricsLineIndex` (datamodel.md,
 * almost always `0`) tells us which channel to read.
 *
 * Thin call-through to the shared walk (`packages/shared/src/
 * lyrics-walk.ts#walkSyllables`) — also used by the pipeline's
 * `extractSyllables`, so the two implementations can't drift apart again
 * (constitution Principle II). See that module's doc comment for the tick
 * source and tie-aware dedup rationale, and the alphaTab GH #2727 caveat.
 */
export function walkLyricBeats(score: at.model.Score, lyricsTrackIndex: number, lyricsLineIndex: number): Syllable[] {
  return walkSyllables(score, { trackIndex: lyricsTrackIndex, lineIndex: lyricsLineIndex });
}

/**
 * GP-semantics syllable derivation (feedback F001): when the song's meta
 * provides `lyricsRawLine` (the raw, un-dispatched track-level lyric line —
 * datamodel.md), the overlay's syllable stream comes from re-dispatching it
 * with GP's own semantics — chunked by alphaTab's own `at.model.Lyrics`
 * chunker (never reimplemented), placed by the shared `dispatchLyrics`
 * (rests, tie destinations, grace beats, and shift-slide-out beats skipped
 * for non-empty chunks; a whitespace-only `+` hold chunk consumes one
 * singable beat emitting nothing; an empty chunk burns the very next beat
 * of any kind) — instead of trusting the per-beat `beat.lyrics` that
 * alphaTab's divergent `applyLyrics` produced at score load.
 * `walkLyricBeats` stays the fallback when the field is absent
 * (legacy/personal catalog songs). Same tick source as `walkSyllables`
 * (`beat.absolutePlaybackStart`); mirrors the pipeline's
 * `extractSyllablesFromRawLine` so `.lrc` and overlay can't drift apart
 * (constitution Principle II).
 */
export function walkLyricBeatsFromRawLine(score: at.model.Score, lyricsTrackIndex: number, rawLine: string): Syllable[] {
  const lyrics = new at.model.Lyrics();
  lyrics.text = rawLine;
  (lyrics as any).finish(false);
  const chunks: string[] = (lyrics as any).chunks;

  const beats: DispatchBeat[] = [];
  for (const staff of score.tracks[lyricsTrackIndex].staves) {
    for (const bar of staff.bars) {
      for (const beat of bar.voices[0].beats) {
        beats.push({
          tickPosition: beat.absolutePlaybackStart,
          isRest: beat.isRest,
          isTieDestination: beat.notes?.some((n) => n.isTieDestination) ?? false,
          isGrace: beat.graceType !== at.model.GraceType.None,
          isShiftSlideOrigin: beat.notes?.some((n) => n.slideOutType === at.model.SlideOutType.Shift) ?? false,
        });
      }
    }
  }
  return dispatchLyrics(chunks, beats);
}

/** Regroups the flat syllable stream into lines using lyricLineBreaks (syllable-count-per-line, datamodel.md) — matches .lrc's line boundaries. */
/**
 * Regroups syllables already placed on the playback timeline
 * (`unrollSyllables`, whose `sourceIndex` points into the flat written
 * stream `groupIntoLines(...).flat()`) back into the song's lines, for the
 * ticker's whole-line mode (lyrics-ticker-scroll-modes). A line starts at
 * each written line break, and again whenever playback jumps back (a
 * repeat), so a repeated line is its own line on each pass.
 */
export function groupPlacedIntoLines<T extends { sourceIndex: number }>(placed: T[], lyricLineBreaks: number[]): T[][] {
  const lineStarts: number[] = [];
  let cursor = 0;
  for (const count of lyricLineBreaks) {
    lineStarts.push(cursor);
    cursor += count;
  }
  const lineOf = (sourceIndex: number) => {
    let line = 0;
    for (let i = 0; i < lineStarts.length; i++) if (lineStarts[i] <= sourceIndex) line = i;
    return line;
  };
  const lines: T[][] = [];
  let prev: T | undefined;
  for (const syllable of placed) {
    if (!prev || lineOf(syllable.sourceIndex) !== lineOf(prev.sourceIndex) || syllable.sourceIndex <= prev.sourceIndex) lines.push([]);
    lines[lines.length - 1].push(syllable);
    prev = syllable;
  }
  return lines;
}

export function groupIntoLines(syllables: Syllable[], lyricLineBreaks: number[]): Syllable[][] {
  const lines: Syllable[][] = [];
  let cursor = 0;
  for (const count of lyricLineBreaks) {
    lines.push(syllables.slice(cursor, cursor + count));
    cursor += count;
  }
  return lines;
}
