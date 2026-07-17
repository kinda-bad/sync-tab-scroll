import type * as at from '@coderline/alphatab';

export interface Syllable {
  text: string;
  tickPosition: number;
}

export interface LyricsWalkSource {
  /** Index of the track whose beats carry the lyrics. */
  trackIndex: number;
  /** Which index into a beat's Beat.lyrics array holds the real content. */
  lineIndex: number;
}

/**
 * Shared syllable walk (infrastructure.md In-Tab Lyrics Overlay): walks a
 * track's beats in score order and returns the flat, ordered syllable
 * stream for the given lyric line/channel index. Used identically by
 * `client/src/lyrics-beat-walk.ts` (live overlay) and
 * `packages/pipeline/src/gp-parser.ts#extractSyllables` (offline `.lrc`
 * generation) so the two can never drift apart again (constitution
 * Principle II).
 *
 * Tick source is `beat.absolutePlaybackStart` — alphaTab's own
 * playback-timeline tick, which (unlike `bar.masterBar.start +
 * beat.playbackStart`, a *display*-timeline reconstruction) already
 * accounts for grace-note timing shifts.
 *
 * Dedup is tie-aware: a beat collapses into the previous syllable only
 * when its lyric text matches AND at least one of its notes is a tie
 * continuation (`beat.notes.some(n => n.isTieDestination)`) — i.e. it's a
 * sustained/melisma syllable spread across tied beats, not a distinct
 * repeated word (e.g. "yeah, yeah, yeah") that happens to share text with
 * its predecessor. Same-text-alone was the old (buggy) discriminator; it
 * wrongly collapsed genuinely-repeated distinct syllables.
 *
 * Known upstream caveat (alphaTab GitHub issue #2727, open as of v1.8.1):
 * tied/continuation beats aren't skipped consistently by alphaTab's own
 * lyric renderer on some inputs. Validated empirically this project: not
 * reachable for modern GP7/8 exports with pre-dispatched per-beat lyrics
 * (which set alphaTab's internal `_skipApplyLyrics` flag) — only a legacy
 * GP3-5 concern.
 */
export function walkSyllables(score: at.model.Score, source: LyricsWalkSource): Syllable[] {
  const track = score.tracks[source.trackIndex];
  const syllables: Syllable[] = [];
  for (const staff of track.staves) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          const text = beat.lyrics?.[source.lineIndex];
          if (text && text.length > 0) {
            const previous = syllables[syllables.length - 1];
            const isTieContinuation = beat.notes?.some((n) => n.isTieDestination) ?? false;
            if (previous && previous.text === text && isTieContinuation) continue;
            syllables.push({ text, tickPosition: beat.absolutePlaybackStart });
          }
        }
      }
    }
  }
  return syllables;
}
