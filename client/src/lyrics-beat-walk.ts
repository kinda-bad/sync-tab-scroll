import type * as at from '@coderline/alphatab';

export interface Syllable {
  text: string;
  tickPosition: number;
}

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
 * Known upstream caveat (alphaTab GitHub issue #2727, open as of v1.8.1):
 * tied/continuation beats aren't skipped consistently by alphaTab's own
 * lyric renderer on some inputs. Validated empirically this project: not
 * reachable for modern GP7/8 exports with pre-dispatched per-beat lyrics
 * (which set alphaTab's internal `_skipApplyLyrics` flag) — only a legacy
 * GP3-5 concern.
 */
export function walkLyricBeats(score: at.model.Score, lyricsTrackIndex: number, lyricsLineIndex: number): Syllable[] {
  const track = score.tracks[lyricsTrackIndex];
  const syllables: Syllable[] = [];
  for (const staff of track.staves) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          const text = beat.lyrics?.[lyricsLineIndex];
          if (text && text.length > 0) {
            const previous = syllables[syllables.length - 1];
            // Collapse consecutive beats sharing the same lyric text — a
            // sustained/melisma syllable dispatched by alphaTab onto
            // multiple beats, not multiple distinct syllables. Verified
            // empirically against Creep.gp: 246 populated beats vs. 231
            // syllables in the raw line text, exactly accounted for by 14
            // such runs (e.g. "o-" repeated across 4 consecutive beats).
            // Keeps the first beat's tick as the syllable's onset.
            if (previous && previous.text === text) continue;
            syllables.push({ text, tickPosition: bar.masterBar.start + beat.playbackStart });
          }
        }
      }
    }
  }
  return syllables;
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
