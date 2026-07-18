import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as at from '@coderline/alphatab';
import AdmZip from 'adm-zip';
import { dispatchLyrics, type DispatchBeat } from './lyrics-dispatch';
import type { Syllable } from './lyrics-walk';

// --- Group (a): synthetic fixtures, one semantic rule each -----------------

function beat(
  tickPosition: number,
  opts: { rest?: boolean; tie?: boolean; grace?: boolean; slide?: boolean } = {},
): DispatchBeat {
  return {
    tickPosition,
    isRest: opts.rest ?? false,
    isTieDestination: opts.tie ?? false,
    isGrace: opts.grace ?? false,
    isShiftSlideOrigin: opts.slide ?? false,
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

// --- Group (a2): rules adopted from the Creep fit (tasks-creep-dispatch) ---

describe('dispatchLyrics (Creep-fit rules: grace, shift-slide, whitespace hold)', () => {
  it('a non-empty chunk skips grace beats', () => {
    const beats = [beat(0), beat(10, { grace: true }), beat(20)];
    expect(dispatchLyrics(['sun', 'shine'], beats)).toEqual([
      { text: 'sun', tickPosition: 0 },
      { text: 'shine', tickPosition: 20 },
    ]);
  });

  it('a non-empty chunk skips shift-slide-out beats', () => {
    const beats = [beat(0), beat(10, { slide: true }), beat(20)];
    expect(dispatchLyrics(['sun', 'shine'], beats)).toEqual([
      { text: 'sun', tickPosition: 0 },
      { text: 'shine', tickPosition: 20 },
    ]);
  });

  it('a whitespace-only chunk consumes the next singable beat and emits nothing', () => {
    // "+" markers become whitespace-only chunks via alphaTab's _prepareChunk.
    const beats = [beat(0), beat(10, { rest: true }), beat(20), beat(30)];
    expect(dispatchLyrics(['la', ' ', 'di'], beats)).toEqual([
      { text: 'la', tickPosition: 0 },
      { text: 'di', tickPosition: 30 },
    ]);
  });

  it('a whitespace-only chunk never appears in the output stream', () => {
    const beats = [beat(0), beat(10), beat(20)];
    const out = dispatchLyrics([' ', ' ', 'la'], beats);
    expect(out).toEqual([{ text: 'la', tickPosition: 20 }]);
    expect(out.every((s) => s.text.trim().length > 0)).toBe(true);
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
              isGrace: b.graceType !== at.model.GraceType.None,
              isShiftSlideOrigin: b.notes?.some((n) => n.slideOutType === at.model.SlideOutType.Shift) ?? false,
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

// --- Group (c): real Creep catalog ground truths ---------------------------
// Measure-level anchors from tasks-creep-dispatch-3477 (user-supplied, no
// repeats in the score: played bar == written bar). The known bars-60..62
// one-singable-beat residual is a recorded transcription defect in the
// source tab, NOT asserted here.

const CREEP_GP = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../catalog/kinda-bad/radiohead-creep/Radiohead-Creep-06-25-2026.gp',
);
const hasCreep = fs.existsSync(CREEP_GP);

describe.skipIf(!hasCreep)('dispatchLyrics on the real Creep catalog file', () => {
  const TRACK_INDEX = 0; // lyrics/vocal track

  function readRawLine(): string {
    const xml = new AdmZip(CREEP_GP).readAsText('Content/score.gpif');
    const lines = [...xml.matchAll(/<Lyrics dispatched="true">([\s\S]*?)<\/Lyrics>/g)]
      .flatMap((m) => [...m[1].matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((c) => c[1]))
      .filter((t) => t.trim().length > 0);
    return lines.sort((a, b) => b.length - a.length)[0];
  }

  function chunkRawLine(raw: string): string[] {
    const ly = new at.model.Lyrics();
    ly.text = raw;
    (ly as any).finish(false);
    return (ly as any).chunks as string[];
  }

  function loadBeats(): { tick: number; bar: number; dispatch: DispatchBeat }[] {
    const bytes = fs.readFileSync(CREEP_GP);
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
              isGrace: b.graceType !== at.model.GraceType.None,
              isShiftSlideOrigin: b.notes?.some((n) => n.slideOutType === at.model.SlideOutType.Shift) ?? false,
            },
          });
        }
      }
    }
    return beats;
  }

  function creepSyllables() {
    const beats = loadBeats();
    const syllables = dispatchLyrics(chunkRawLine(readRawLine()), beats.map((b) => b.dispatch));
    const barOf = (tick: number) => beats.filter((b) => b.tick <= tick).at(-1)!.bar;
    return { beats, syllables, barOf };
  }

  it('places "You" (of "You float") first at tick 59040 in bar 16, never before', () => {
    const { syllables, barOf } = creepSyllables();
    const cryIdx = syllables.findIndex((s) => s.text.trim() === 'cry');
    const you = syllables[cryIdx + 1];
    expect(you.text.trim()).toBe('You');
    expect(you.tickPosition).toBe(59040);
    expect(barOf(you.tickPosition)).toBe(16);
  });

  it('places exactly "In a beau-ti-ful world" in bar 18 and nothing in bar 19', () => {
    const { syllables, barOf } = creepSyllables();
    const bar18 = syllables.filter((s) => barOf(s.tickPosition) === 18).map((s) => s.text.trim());
    expect(bar18).toEqual(['In', 'a', 'beau-', 'ti-', 'ful', 'world']);
    expect(syllables.filter((s) => barOf(s.tickPosition) === 19)).toEqual([]);
  });

  it('ends the stream with "I don\'t be-long" in bar 88 and "here" on the final vocal note in bar 89', () => {
    const { syllables, barOf } = creepSyllables();
    const tail = syllables.slice(-5).map((s) => ({ text: s.text.trim(), bar: barOf(s.tickPosition) }));
    expect(tail).toEqual([
      { text: 'I', bar: 88 },
      { text: "don't", bar: 88 },
      { text: 'be-', bar: 88 },
      { text: 'long', bar: 88 },
      { text: 'here', bar: 89 },
    ]);
    expect(syllables.at(-1)!.tickPosition).toBe(338400);
  });

  it('emits no whitespace-only syllables (the raw line has "+" hold markers)', () => {
    const { syllables } = creepSyllables();
    expect(chunkRawLine(readRawLine()).some((c) => c.length > 0 && c.trim().length === 0)).toBe(true);
    expect(syllables.every((s) => s.text.trim().length > 0)).toBe(true);
  });
});
