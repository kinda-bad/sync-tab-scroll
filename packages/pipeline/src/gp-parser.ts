import * as fs from 'node:fs';
import * as at from '@coderline/alphatab';
import { walkSyllables, type Syllable } from '@sync-tab-scroll/shared';

export type LyricsSource = { trackIndex: number; lineIndex: number };

export type { Syllable };

export function loadScore(gpFilePath: string): at.model.Score {
  const bytes = fs.readFileSync(gpFilePath);
  return at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes), new at.Settings());
}

/**
 * Finds the track/line-index that carries GP-embedded lyrics.
 * Beat.lyrics is indexed by lyric line/channel, not by syllable — GP supports
 * multiple simultaneous lyric channels, so a beat's array typically looks like
 * ['word', '', '', '', ''] with real content at one index only. Picks the
 * first non-empty channel found (validated empirically: index 0 in 100% of
 * cases checked against 5 real .gp files this session).
 */
export function findLyricsSource(score: at.model.Score): LyricsSource | null {
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            if (!beat.lyrics) continue;
            const lineIndex = beat.lyrics.findIndex((l) => !!l && l.length > 0);
            if (lineIndex >= 0) {
              return { trackIndex: track.index, lineIndex };
            }
          }
        }
      }
    }
  }
  return null;
}

/**
 * Walks a track's beats in score order and returns the flat, ordered syllable
 * stream for the given line index — filtered to beats where that index is a
 * non-empty string (rests and non-lyric beats never populate Beat.lyrics).
 *
 * Thin call-through to the shared walk (`packages/shared/src/
 * lyrics-walk.ts#walkSyllables`) — also used by the client's
 * `walkLyricBeats`, so the two implementations can't drift apart again
 * (constitution Principle II). See that module's doc comment for the tick
 * source (`beat.absolutePlaybackStart`) and tie-aware dedup rationale, and
 * the alphaTab GH #2727 caveat.
 */
export function extractSyllables(score: at.model.Score, source: LyricsSource): Syllable[] {
  return walkSyllables(score, source);
}

interface TempoSegment {
  startTick: number;
  startMs: number;
  msPerTick: number;
}

/**
 * Builds a tick -> milliseconds converter from the score's own tempo map,
 * generated via alphaTab's MidiFileGenerator (the same mechanism alphaTab
 * uses internally for playback) rather than assuming a constant tempo.
 */
export function buildTickToMs(score: at.model.Score): (tick: number) => number {
  const midiFile = new at.midi.MidiFile();
  const handler = new at.midi.AlphaSynthMidiFileHandler(midiFile);
  new at.midi.MidiFileGenerator(score, new at.Settings(), handler).generate();

  const division = midiFile.division;
  const tempoEvents = midiFile.tracks
    .flatMap((t) => t.events)
    .filter((e): e is at.midi.TempoChangeEvent => e instanceof at.midi.TempoChangeEvent)
    .sort((a, b) => a.tick - b.tick);

  const segments: TempoSegment[] = [];
  let prevTick = 0;
  let prevMs = 0;
  let bpm = tempoEvents[0]?.beatsPerMinute ?? 120;

  for (const event of tempoEvents) {
    const msPerTick = 60000 / (bpm * division);
    segments.push({ startTick: prevTick, startMs: prevMs, msPerTick });
    prevMs += (event.tick - prevTick) * msPerTick;
    prevTick = event.tick;
    bpm = event.beatsPerMinute;
  }
  segments.push({ startTick: prevTick, startMs: prevMs, msPerTick: 60000 / (bpm * division) });

  return (tick: number): number => {
    let segment = segments[0];
    for (const candidate of segments) {
      if (candidate.startTick > tick) break;
      segment = candidate;
    }
    return segment.startMs + (tick - segment.startTick) * segment.msPerTick;
  };
}
