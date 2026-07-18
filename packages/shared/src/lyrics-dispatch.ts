import type { Syllable } from './lyrics-walk.js';

/** A beat projected to the minimal shape GP-semantics lyric dispatch needs. */
export interface DispatchBeat {
  tickPosition: number;
  isRest: boolean;
  isTieDestination: boolean;
  /** Grace-note beat (`beat.graceType !== GraceType.None`) — an ornament, not a sung attack. */
  isGrace: boolean;
  /** Beat whose note shift-slides out into the next (`note.slideOutType === SlideOutType.Shift`) — a melisma glide, not a new attack. */
  isShiftSlideOrigin: boolean;
}

/**
 * GP-semantics lyric dispatch (feedback F001, semantics finalized by the
 * Creep fit — tasks-creep-dispatch-3477): places pre-chunked lyric chunks
 * onto a track's beats the way Guitar Pro itself dispatches a track-level
 * lyric line — NOT the way alphaTab's `applyLyrics` does. Chunk-driven,
 * in order:
 * - an empty chunk consumes exactly the next beat of ANY kind and emits
 *   nothing;
 * - a whitespace-only chunk (a standalone `+` hold marker — alphaTab's
 *   `_prepareChunk` maps `+` to a space) advances past unsingable beats,
 *   consumes the next singable beat, and emits nothing — the previous
 *   syllable simply keeps sounding;
 * - a non-empty chunk advances past unsingable beats, lands on the next
 *   singable beat, and emits `{ text, tickPosition }`.
 * Unsingable beats are rests, tie destinations, grace beats, and
 * shift-slide-out beats — none of them is a fresh sung attack.
 * Terminates cleanly when either chunks or beats are exhausted.
 *
 * alphaTab's `applyLyrics` diverges from GP on these rules (ties are not
 * skipped; empty chunks are burned only on playable beats) — and for GP7/8
 * files carrying per-beat `<Lyrics>` XML it never runs at all (the importer
 * displays the file's hand-placed per-beat lyrics verbatim), which is why
 * this exists. Chunking itself stays alphaTab's (`at.model.Lyrics` —
 * `text` + `finish(false)`); callers pass the resulting `chunks`.
 *
 * Pure and platform-free (no alphaTab import), like `walkSyllables` —
 * shared verbatim by the pipeline's `.lrc` generation and the client's
 * overlay (constitution Principle II).
 */
export function dispatchLyrics(chunks: string[], beats: DispatchBeat[]): Syllable[] {
  const syllables: Syllable[] = [];
  const unsingable = (b: DispatchBeat) =>
    b.isRest || b.isTieDestination || b.isGrace || b.isShiftSlideOrigin;
  let bi = 0;
  for (const chunk of chunks) {
    if (bi >= beats.length) break;
    if (chunk.length === 0) {
      bi++;
      continue;
    }
    while (bi < beats.length && unsingable(beats[bi])) bi++;
    if (bi >= beats.length) break;
    if (chunk.trim().length === 0) {
      // `+` hold: the beat is consumed, the previous syllable keeps sounding.
      bi++;
      continue;
    }
    syllables.push({ text: chunk, tickPosition: beats[bi].tickPosition });
    bi++;
  }
  return syllables;
}
