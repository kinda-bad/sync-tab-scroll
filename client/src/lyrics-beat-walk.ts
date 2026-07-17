import type * as at from '@coderline/alphatab';
import { walkSyllables, type Syllable } from '@sync-tab-scroll/shared';

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

/** Regroups the flat syllable stream into lines using lyricLineBreaks (syllable-count-per-line, datamodel.md) — matches .lrc's line boundaries. */
export function groupIntoLines(syllables: Syllable[], lyricLineBreaks: number[]): Syllable[][] {
  const lines: Syllable[][] = [];
  let cursor = 0;
  for (const count of lyricLineBreaks) {
    lines.push(syllables.slice(cursor, cursor + count));
    cursor += count;
  }
  return lines;
}
