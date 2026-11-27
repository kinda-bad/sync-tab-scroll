import type * as at from '@coderline/alphatab';
import type { Syllable } from './lyrics-walk.js';

/** One played master bar, in playback order (a repeated bar appears once per pass). */
export interface MasterBarPlay {
  masterBarIndex: number;
  /** Playback (MIDI) tick at which this pass of the bar starts. */
  playbackStart: number;
}

/** The score's written bar starts plus alphaTab's playback order, the two inputs `unrollSyllables` needs. */
export interface PlaybackOrder {
  /** Written (notation) start tick of each master bar, indexed by `MasterBar.index`. Same tick space as `Beat.absolutePlaybackStart`. */
  masterBarStarts: number[];
  plays: MasterBarPlay[];
}

/** A syllable placed on the playback timeline. `sourceIndex` points back into the written syllable list it came from. */
export interface PlacedSyllable extends Syllable {
  sourceIndex: number;
}

/**
 * Reads the playback order from alphaTab's own `MidiTickLookup` (the
 * `api.tickCache` of a live player, or `MidiFileGenerator.tickLookup` when
 * generating offline). Its `masterBars` list holds one entry per played
 * bar, in playback order, with repeats, alternate endings and directions
 * already expanded by alphaTab's `MidiPlaybackController` — nothing here
 * re-derives repeat semantics (constitution Principle V). Type-only alphaTab
 * import: this reads properties and stays platform-free.
 */
export function playbackOrderOf(score: at.model.Score, tickLookup: at.midi.MidiTickLookup): PlaybackOrder {
  return {
    masterBarStarts: score.masterBars.map((masterBar) => masterBar.start),
    plays: tickLookup.masterBars.map((lookup) => ({ masterBarIndex: lookup.masterBar.index, playbackStart: lookup.start })),
  };
}

/**
 * Moves a written-order syllable stream (`walkSyllables` /
 * `dispatchLyrics` output, whose ticks are notation ticks) onto the playback
 * timeline: each syllable is emitted once per play of its bar, at
 * `play.playbackStart + (tick - masterBarStart)`. GP dispatches one syllable
 * set per written bar, so a repeated bar sings the same syllables on every
 * pass; a bar that is never played (e.g. skipped by a direction) emits
 * nothing. Used by both the client's ticker and the pipeline's `.lrc`
 * generation so the two stay on the same timeline (constitution Principle II).
 *
 * A syllable belongs to the last bar starting at or before its tick (clamped
 * to the first bar, for a grace-shifted tick just before bar 1).
 */
export function unrollSyllables(syllables: Syllable[], masterBarStarts: number[], plays: MasterBarPlay[]): PlacedSyllable[] {
  const byBar = new Map<number, number[]>();
  syllables.forEach((syllable, index) => {
    const bar = barIndexAt(masterBarStarts, syllable.tickPosition);
    const list = byBar.get(bar);
    if (list) list.push(index);
    else byBar.set(bar, [index]);
  });

  const placed: PlacedSyllable[] = [];
  for (const play of plays) {
    const barStart = masterBarStarts[play.masterBarIndex];
    for (const index of byBar.get(play.masterBarIndex) ?? []) {
      const syllable = syllables[index];
      placed.push({ text: syllable.text, tickPosition: play.playbackStart + (syllable.tickPosition - barStart), sourceIndex: index });
    }
  }
  return placed;
}

function barIndexAt(masterBarStarts: number[], tick: number): number {
  let lo = 0;
  let hi = masterBarStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (masterBarStarts[mid] <= tick) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
