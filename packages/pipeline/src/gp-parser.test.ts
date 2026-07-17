import * as at from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { buildMsToTick, buildTickToMs } from './gp-parser.js';

/**
 * Builds a minimal but real `at.model.Score` (two bars, one track/staff/
 * voice/beat per bar) with a tempo change on the second bar — enough for
 * `MidiFileGenerator` (which both `buildTickToMs` and `buildMsToTick` walk)
 * to produce a real multi-segment tempo map, proving the round-trip isn't
 * just assuming constant tempo.
 */
function fakeScoreWithTempoChange(): at.model.Score {
  const score = new at.model.Score();

  const mb1 = new at.model.MasterBar();
  score.addMasterBar(mb1);

  const mb2 = new at.model.MasterBar();
  score.addMasterBar(mb2);
  mb2.tempoAutomations.push(at.model.Automation.buildTempoAutomation(false, 0, 90, 0));

  const track = new at.model.Track();
  score.addTrack(track);
  track.ensureStaveCount(1);
  const staff = track.staves[0];

  for (const _mb of score.masterBars) {
    const bar = new at.model.Bar();
    staff.addBar(bar);
    const voice = new at.model.Voice();
    bar.addVoice(voice);
    const beat = new at.model.Beat();
    voice.addBeat(beat);
    beat.duration = at.model.Duration.Quarter;
    const note = new at.model.Note();
    note.fret = 0;
    note.string = 1;
    beat.addNote(note);
  }

  score.finish(new at.Settings());
  return score;
}

describe('buildMsToTick', () => {
  it('round-trips against buildTickToMs across sample ticks, including across a tempo change', () => {
    const score = fakeScoreWithTempoChange();
    const tickToMs = buildTickToMs(score);
    const msToTick = buildMsToTick(score);

    // Bar 1 starts at tick 0 (120bpm), bar 2 starts at tick 3840 (90bpm) —
    // sample ticks before, at, and after the tempo change.
    for (const tick of [0, 500, 1920, 3840, 4800, 6000]) {
      const ms = tickToMs(tick);
      const roundTripped = msToTick(ms);
      expect(roundTripped).toBeCloseTo(tick, 0);
    }
  });
});
