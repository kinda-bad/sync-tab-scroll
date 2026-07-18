import type { Syllable } from './lyrics-walk.js';

/** A beat projected to the minimal shape GP-semantics lyric dispatch needs. */
export interface DispatchBeat {
  tickPosition: number;
  isRest: boolean;
  isTieDestination: boolean;
}

/**
 * GP-semantics lyric dispatch (feedback F001): places pre-chunked lyric
 * chunks onto a track's beats the way Guitar Pro itself dispatches a
 * track-level lyric line — NOT the way alphaTab's `applyLyrics` does.
 * Chunk-driven, in order:
 * - an empty chunk consumes exactly the next beat of ANY kind (note, rest,
 *   or tie destination) and emits nothing;
 * - a non-empty chunk advances past rest and tie-destination beats, lands
 *   on the next singable beat, and emits `{ text, tickPosition }`.
 * Terminates cleanly when either chunks or beats are exhausted.
 *
 * alphaTab's `applyLyrics` diverges from GP on both rules (ties are not
 * skipped; empty chunks are burned only on playable beats), which is why
 * this exists. Chunking itself stays alphaTab's (`at.model.Lyrics` —
 * `text` + `finish(false)`); callers pass the resulting `chunks`.
 *
 * Pure and platform-free (no alphaTab import), like `walkSyllables` —
 * shared verbatim by the pipeline's `.lrc` generation and the client's
 * overlay (constitution Principle II).
 */
export function dispatchLyrics(chunks: string[], beats: DispatchBeat[]): Syllable[] {
  const syllables: Syllable[] = [];
  let bi = 0;
  for (const chunk of chunks) {
    if (bi >= beats.length) break;
    if (chunk.length === 0) {
      bi++;
      continue;
    }
    while (bi < beats.length && (beats[bi].isRest || beats[bi].isTieDestination)) bi++;
    if (bi >= beats.length) break;
    syllables.push({ text: chunk, tickPosition: beats[bi].tickPosition });
    bi++;
  }
  return syllables;
}
