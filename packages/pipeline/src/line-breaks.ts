import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import type { Syllable } from './gp-parser.js';
import type { TimedLrclibLine } from './lrclib.js';

/**
 * GP's own line-break placement is NOT exposed by alphaTab's public API —
 * validated this session: alphaTab only surfaces per-beat dispatched
 * syllables, discarding the raw whole-track lyrics text (with the author's
 * own line breaks, when present) once dispatched per-beat data exists. This
 * reads score.gpif's Track-level <Lyrics><Line><Text> directly from the
 * .gp file's zip contents instead — a lightweight raw XML read, not a full
 * GP-parsing library.
 */
export function readRawLyricsLines(gpFilePath: string, trackIndex: number, lineIndex: number): string[] | null {
  const zip = new AdmZip(gpFilePath);
  const entry = zip.getEntry('Content/score.gpif');
  if (!entry) return null;

  const parser = new XMLParser({
    isArray: (name) => name === 'Track' || name === 'Line',
    cdataPropName: '#cdata',
  });
  const xml = parser.parse(entry.getData().toString('utf8'));

  const track = xml?.GPIF?.Tracks?.Track?.[trackIndex];
  const line = track?.Lyrics?.Line?.[lineIndex];
  const rawText: string | undefined = line?.Text?.['#cdata'] ?? line?.Text;
  if (!rawText) return null;

  const lines = rawText
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  return lines.length > 0 ? lines : null;
}

/**
 * Counts syllables in a GP-authored lyric line using GP's own hyphen/plus
 * conventions: hyphens mark syllable breaks within a word ("be-fore"), and a
 * standalone "+" is a merge marker joining adjacent words onto the same beat
 * rather than a new syllable. This is a first-pass heuristic, not a proven
 * replica of alphaTab's internal chunk-dispatch algorithm (Lyrics._prepareChunk) —
 * validated against GP's own line-break placement when present; melisma-style
 * edge cases (e.g. repeated "+" padding) may need refinement later.
 */
export function countSyllables(line: string): number {
  const words = line.split(/\s+/).filter((w) => w.length > 0 && w !== '+');
  return words.reduce((count, word) => count + word.split('-').length, 0);
}

/**
 * Places lrclib-derived line boundaries in the GP syllable stream by
 * nearest-tick match — timestamp-grounded, not word-count-proportional
 * (pipeline.md). For each `timedLine`, converts its `tickMs` to a tick via
 * `msToTick` (`buildMsToTick`, gp-parser.ts), and finds the syllable-stream
 * index whose tick is closest to it. The gap between consecutive matched
 * indices becomes that line's syllable count; the last line gets whatever
 * syllables remain (covers any trailing GP syllables past the last lrclib
 * line's timestamp).
 *
 * Deliberately ignores line/syllable *text* entirely — grounded only in
 * tick proximity — since lrclib's line wording and GP's own syllable text
 * can disagree (e.g. an extra leading word in one but not the other); text
 * matching would break on exactly that disagreement, tick proximity does
 * not.
 */
export function alignLinesByTimestamp(syllables: Syllable[], timedLines: TimedLrclibLine[], msToTick: (ms: number) => number): number[] {
  const boundaryIndices = timedLines.map((line) => {
    const targetTick = msToTick(line.tickMs);
    let closestIndex = 0;
    let closestDistance = Infinity;
    for (let i = 0; i < syllables.length; i++) {
      const distance = Math.abs(syllables[i].tickPosition - targetTick);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    return closestIndex;
  });

  const counts: number[] = [];
  for (let i = 0; i < boundaryIndices.length; i++) {
    const start = boundaryIndices[i];
    const end = i + 1 < boundaryIndices.length ? boundaryIndices[i + 1] : syllables.length;
    counts.push(Math.max(0, end - start));
  }
  return counts;
}
