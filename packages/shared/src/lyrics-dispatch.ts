import type { Syllable } from './lyrics-walk.js';

/** A beat projected to the minimal shape GP-semantics lyric dispatch needs. */
export interface DispatchBeat {
  tickPosition: number;
  isRest: boolean;
  isTieDestination: boolean;
}

export function dispatchLyrics(chunks: string[], beats: DispatchBeat[]): Syllable[] {
  throw new Error('not implemented (T002)');
}
