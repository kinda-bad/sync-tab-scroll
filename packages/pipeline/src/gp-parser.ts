import * as fs from 'node:fs';
import * as at from '@coderline/alphatab';
import { walkSyllables, dispatchLyrics, type Syllable, type DispatchBeat } from '@sync-tab-scroll/shared';

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

/**
 * GP-semantics syllable extraction (feedback F001): chunks the raw
 * track-level lyric line with alphaTab's own chunker (`at.model.Lyrics` —
 * never reimplemented) and dispatches the chunks onto the track's beats
 * with the shared `dispatchLyrics` (GP dispatch semantics: ties skipped for
 * non-empty chunks, empty chunks burn any beat) instead of trusting the
 * per-beat `beat.lyrics` alphaTab's divergent `applyLyrics` produced.
 * Preferred over `extractSyllables` whenever a raw line exists
 * (`readRawLyricsLine`); `walkSyllables` stays the fallback.
 */
export function extractSyllablesFromRawLine(score: at.model.Score, trackIndex: number, rawText: string): Syllable[] {
  const lyrics = new at.model.Lyrics();
  lyrics.text = rawText;
  (lyrics as any).finish(false);
  const chunks: string[] = (lyrics as any).chunks;

  const beats: DispatchBeat[] = [];
  for (const staff of score.tracks[trackIndex].staves) {
    for (const bar of staff.bars) {
      for (const beat of bar.voices[0].beats) {
        beats.push({
          tickPosition: beat.absolutePlaybackStart,
          isRest: beat.isRest,
          isTieDestination: beat.notes?.some((n) => n.isTieDestination) ?? false,
        });
      }
    }
  }
  return dispatchLyrics(chunks, beats);
}

interface TempoSegment {
  startTick: number;
  startMs: number;
  msPerTick: number;
}

/**
 * Builds the score's tempo-segment map via alphaTab's MidiFileGenerator (the
 * same mechanism alphaTab uses internally for playback) rather than assuming
 * a constant tempo. Shared internal helper for both `buildTickToMs` and
 * `buildMsToTick` (constitution Principle II) — one MIDI tempo-map walk, not
 * two duplicated ones.
 */
function buildTempoSegments(score: at.model.Score): TempoSegment[] {
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

  return segments;
}

/**
 * Builds a tick -> milliseconds converter from the score's own tempo map.
 */
export function buildTickToMs(score: at.model.Score): (tick: number) => number {
  const segments = buildTempoSegments(score);

  return (tick: number): number => {
    let segment = segments[0];
    for (const candidate of segments) {
      if (candidate.startTick > tick) break;
      segment = candidate;
    }
    return segment.startMs + (tick - segment.startTick) * segment.msPerTick;
  };
}

/**
 * Builds a milliseconds -> tick converter — the inverse of `buildTickToMs`,
 * over the same tempo-segment map (pipeline.md line-boundary placement:
 * `alignLinesByTimestamp` converts lrclib's per-line `mm:ss.xx` timestamps
 * to ticks via this function).
 */
export function buildMsToTick(score: at.model.Score): (ms: number) => number {
  const segments = buildTempoSegments(score);
  const segmentsWithEndMs = segments.map((segment, i) => ({
    ...segment,
    endMs: i + 1 < segments.length ? segments[i + 1].startMs : Infinity,
  }));

  return (ms: number): number => {
    let segment = segmentsWithEndMs[0];
    for (const candidate of segmentsWithEndMs) {
      if (candidate.startMs > ms) break;
      segment = candidate;
    }
    return segment.startTick + (ms - segment.startMs) / segment.msPerTick;
  };
}
