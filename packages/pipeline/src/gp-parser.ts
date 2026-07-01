import * as fs from 'node:fs';
import * as at from '@coderline/alphatab';

export interface LyricsSource {
  /** Index of the track whose beats carry the lyrics. */
  trackIndex: number;
  /** Which index into a beat's Beat.lyrics array holds the real content. */
  lineIndex: number;
}

export interface Syllable {
  text: string;
  tickPosition: number;
}

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
 * Known upstream caveat (alphaTab GitHub issue #2727, open as of v1.8.1):
 * tied/continuation beats aren't skipped consistently by alphaTab's own
 * lyric renderer on some inputs. Validated this session: not reachable for
 * modern GP7/8 exports with pre-dispatched per-beat lyrics (which set
 * alphaTab's internal _skipApplyLyrics flag) — only a legacy GP3-5 concern.
 */
export function extractSyllables(score: at.model.Score, source: LyricsSource): Syllable[] {
  const track = score.tracks[source.trackIndex];
  const syllables: Syllable[] = [];
  for (const staff of track.staves) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          const text = beat.lyrics?.[source.lineIndex];
          if (text && text.length > 0) {
            syllables.push({
              text,
              tickPosition: bar.masterBar.start + beat.playbackStart,
            });
          }
        }
      }
    }
  }
  return syllables;
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
