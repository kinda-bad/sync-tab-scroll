import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as at from '@coderline/alphatab';
import AdmZip from 'adm-zip';
import { dispatchLyrics, type DispatchBeat } from './lyrics-dispatch';
import type { Syllable } from './lyrics-walk';

// --- Group (a): synthetic fixtures, one semantic rule each -----------------

function beat(tickPosition: number, opts: { rest?: boolean; tie?: boolean } = {}): DispatchBeat {
  return {
    tickPosition,
    isRest: opts.rest ?? false,
    isTieDestination: opts.tie ?? false,
  };
}

describe('dispatchLyrics (GP dispatch semantics)', () => {
  it('a non-empty chunk skips rest beats and lands on the next singable beat', () => {
    const beats = [beat(0, { rest: true }), beat(10, { rest: true }), beat(20)];
    expect(dispatchLyrics(['la'], beats)).toEqual([{ text: 'la', tickPosition: 20 }]);
  });

  it('a non-empty chunk skips tie-destination beats', () => {
    const beats = [beat(0), beat(10, { tie: true }), beat(20)];
    expect(dispatchLyrics(['sun', 'shine'], beats)).toEqual([
      { text: 'sun', tickPosition: 0 },
      { text: 'shine', tickPosition: 20 },
    ]);
  });

  it('an empty chunk consumes exactly one note beat with no output', () => {
    const beats = [beat(0), beat(10), beat(20)];
    expect(dispatchLyrics(['', 'la'], beats)).toEqual([{ text: 'la', tickPosition: 10 }]);
  });

  it('an empty chunk consumes exactly one rest beat with no output', () => {
    const beats = [beat(0, { rest: true }), beat(10), beat(20)];
    expect(dispatchLyrics(['', 'la'], beats)).toEqual([{ text: 'la', tickPosition: 10 }]);
  });

  it('an empty chunk consumes exactly one tie-destination beat with no output', () => {
    const beats = [beat(0, { tie: true }), beat(10), beat(20)];
    expect(dispatchLyrics(['', 'la'], beats)).toEqual([{ text: 'la', tickPosition: 10 }]);
  });

  it('terminates cleanly when chunks run out before beats', () => {
    const beats = [beat(0), beat(10), beat(20)];
    expect(dispatchLyrics(['la'], beats)).toEqual([{ text: 'la', tickPosition: 0 }]);
  });

  it('terminates cleanly when beats run out before chunks', () => {
    const beats = [beat(0)];
    expect(dispatchLyrics(['la', 'di', 'da'], beats)).toEqual([{ text: 'la', tickPosition: 0 }]);
    expect(dispatchLyrics(['', 'la'], [beat(0)])).toEqual([]);
    // Non-empty chunk with only unsingable beats left: nothing more emitted.
    expect(dispatchLyrics(['la', 'di'], [beat(0), beat(10, { rest: true })])).toEqual([
      { text: 'la', tickPosition: 0 },
    ]);
  });
});

// --- Group (b): real TIRO catalog ground truths ----------------------------

// Real commercial catalog content is gitignored; skip when absent (e.g. CI).
const TIRO_GP = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp',
);
const hasTiro = fs.existsSync(TIRO_GP);

describe.skipIf(!hasTiro)('dispatchLyrics on the real TIRO catalog file', () => {
  const TRACK_INDEX = 1; // vocals

  // Raw track-level lyric line: longest non-empty
  // <Lyrics dispatched="true"><Line><Text> CDATA in Content/score.gpif.
  function readRawLine(): string {
    const xml = new AdmZip(TIRO_GP).readAsText('Content/score.gpif');
    const lines = [...xml.matchAll(/<Lyrics dispatched="true">([\s\S]*?)<\/Lyrics>/g)]
      .flatMap((m) => [...m[1].matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((c) => c[1]))
      .filter((t) => t.trim().length > 0);
    return lines.sort((a, b) => b.length - a.length)[0];
  }

  // alphaTab's own chunker, via its public model class — never reimplemented.
  function chunkRawLine(raw: string): string[] {
    const ly = new at.model.Lyrics();
    ly.text = raw;
    (ly as any).finish(false);
    return (ly as any).chunks as string[];
  }

  function loadBeats(): { tick: number; bar: number; dispatch: DispatchBeat }[] {
    const bytes = fs.readFileSync(TIRO_GP);
    const score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes), new at.Settings());
    const track = score.tracks[TRACK_INDEX];
    const beats: { tick: number; bar: number; dispatch: DispatchBeat }[] = [];
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        for (const b of bar.voices[0].beats) {
          beats.push({
            tick: b.absolutePlaybackStart,
            bar: bar.index + 1,
            dispatch: {
              tickPosition: b.absolutePlaybackStart,
              isRest: b.isRest,
              isTieDestination: b.notes?.some((n) => n.isTieDestination) ?? false,
            },
          });
        }
      }
    }
    return beats;
  }

  // Same last-syllable-with-tickPosition<=tick scan the overlay uses.
  function activeAt(syllables: Syllable[], tick: number): Syllable | null {
    let last: Syllable | null = null;
    for (const s of syllables) {
      if (s.tickPosition <= tick) last = s;
      else break;
    }
    return last;
  }

  it('places "be" at bar 14 beat 1, "this?" at bar 69 beat 1, and holds "ground" from bar 101 through bar 102 beat 1', () => {
    const beats = loadBeats();
    const chunks = chunkRawLine(readRawLine());
    const syllables = dispatchLyrics(
      chunks,
      beats.map((b) => b.dispatch),
    );

    const bar1Tick = (bar: number) => beats.find((b) => b.bar === bar)!.tick;
    const barOf = (tick: number) => beats.filter((b) => b.tick <= tick).at(-1)!.bar;

    expect(activeAt(syllables, bar1Tick(14))?.text).toBe('be');
    expect(activeAt(syllables, bar1Tick(69))?.text).toBe('this?');

    // Bar 102 beat 1 has no syllable of its own — the active syllable is
    // still "ground", dispatched back in bar 101.
    const held = activeAt(syllables, bar1Tick(102))!;
    expect(held.text).toBe('ground');
    expect(barOf(held.tickPosition)).toBe(101);
    expect(held.tickPosition).toBeLessThan(bar1Tick(102));
  });
});
