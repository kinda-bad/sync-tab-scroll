import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as at from '@coderline/alphatab';
import type { AlphaTabApi } from '@coderline/alphatab';
import type { PlaybackState, Session } from '@sync-tab-scroll/shared';
import { applyPlaybackSettings, correctDrift, installCountInCursorGuard } from './playback-sync';

/**
 * Fixture masterbar/score carrying only the fields tempo-lookup.ts reads —
 * same "fake score" pattern as lyrics-gap-timing.test.ts/tempo-lookup.test.ts.
 * One giant bar at a constant tempo, big enough that every test tick stays
 * inside it.
 */
function fakeScore(tempo: number): at.model.Score {
  const masterBar = {
    start: 0,
    tempoAutomations: [{ type: 0, value: tempo }],
    calculateDuration: () => 4 * 960 * 100000,
  };
  return { tempo, masterBars: [masterBar] } as unknown as at.model.Score;
}

function fakeApi(overrides: Partial<{ isReadyForPlayback: boolean; tickPosition: number; playerState: at.synth.PlayerState; score: at.model.Score }> = {}) {
  return {
    isReadyForPlayback: true,
    tickPosition: 0,
    playerState: at.synth.PlayerState.Paused,
    score: fakeScore(120),
    play: vi.fn(),
    pause: vi.fn(),
    metronomeVolume: 0,
    countInVolume: 0,
    ...overrides,
  } as unknown as AlphaTabApi & { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> };
}

function fakePlaybackState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: Date.now(), ...overrides };
}

describe('correctDrift', () => {
  // Freeze the clock so serverTimestamp: Date.now() (fakePlaybackState's
  // default) means zero elapsed time — the latency-compensated extrapolation
  // added below the drift comparison then contributes 0 extra ticks for
  // every pre-existing test in this file that doesn't set serverTimestamp
  // itself.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null and does nothing when not ready for playback', () => {
    const api = fakeApi({ isReadyForPlayback: false, tickPosition: 100 });
    const result = correctDrift(api, fakePlaybackState({ tickPosition: 500 }), false);
    expect(result).toBeNull();
    expect(api.tickPosition).toBe(100);
  });

  it('starts playback when running and not yet playing', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 777 }), false);
    expect(api.tickPosition).toBe(777);
    expect(api.play).toHaveBeenCalledOnce();
    expect(result).toBe(777);
  });

  it('starts playback for the host too (status transition, not a tick comparison)', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 777 }), true);
    expect(api.tickPosition).toBe(777);
    expect(api.play).toHaveBeenCalledOnce();
    expect(result).toBe(777);
  });

  it('starts playback without seeking when already at the target tick (count-in cursor-slide bug)', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused, tickPosition: 0 });
    const onApply = vi.fn();
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 0 }), false, onApply);
    expect(api.play).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('pauses when not running but still playing', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 300 });
    const result = correctDrift(api, fakePlaybackState({ status: 'paused', tickPosition: 300 }), false);
    expect(api.pause).toHaveBeenCalledOnce();
    expect(result).toBeNull();
  });

  it('snaps and returns the applied tick when drift exceeds the threshold', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 0 });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 1000 }), false);
    expect(api.tickPosition).toBe(1000);
    expect(result).toBe(1000);
  });

  it('returns null and leaves tickPosition alone when drift is within the threshold', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 1000 });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 1010 }), false);
    expect(api.tickPosition).toBe(1000);
    expect(result).toBeNull();
  });

  it('does not extrapolate a phantom tick forward for a non-host once paused, even as wall-clock time elapses', () => {
    // Regression for the live 2026-07-18 repro: paused on bar 14 with the
    // cursor correctly placed, but the lyrics ticker had already advanced
    // two words ahead. Root cause: the pause branch above didn't return,
    // so later store updates (with wall-clock time having advanced past a
    // now-stale serverTimestamp) fell through into the latency-extrapolation
    // block below and kept forcing tickPosition forward even though nothing
    // was playing.
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused, tickPosition: 300 });
    const playbackState = fakePlaybackState({ status: 'paused', tickPosition: 300, serverTimestamp: Date.now() });
    vi.advanceTimersByTime(5000); // 5s paused — plenty to exceed the drift threshold if extrapolated
    const result = correctDrift(api, playbackState, false);
    expect(api.pause).not.toHaveBeenCalled(); // already paused, not a fresh transition
    expect(api.tickPosition).toBe(300);
    expect(result).toBeNull();
  });

  it('propagates a host seek-while-paused to a paused non-host (drift against the raw tick, no extrapolation)', () => {
    // T011 (feedback F002): while paused, extrapolation is off (elapsedTicks
    // = 0) but drift correction against the raw playbackState.tickPosition
    // must still run — otherwise a host seek while paused never reaches
    // non-hosts until playback resumes.
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused, tickPosition: 300 });
    const playbackState = fakePlaybackState({ status: 'paused', tickPosition: 5000, serverTimestamp: Date.now() });
    vi.advanceTimersByTime(5000); // stale timestamp must NOT inflate the target
    const result = correctDrift(api, playbackState, false);
    expect(api.tickPosition).toBe(5000);
    expect(result).toBe(5000);
  });

  it('never drift-corrects the host, even when drift exceeds the threshold', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 5000 });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 100 }), true);
    expect(api.tickPosition).toBe(5000);
    expect(result).toBeNull();
  });

  it('resets tickPosition to 0 on a full Stop while playing, host included', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 5000 });
    const result = correctDrift(api, fakePlaybackState({ status: 'stopped', tickPosition: 0 }), true);
    expect(api.pause).toHaveBeenCalledOnce();
    expect(api.tickPosition).toBe(0);
    expect(result).toBe(0);
  });

  it('resets tickPosition to 0 on a full Stop from an already-paused state, host included', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused, tickPosition: 5000 });
    const result = correctDrift(api, fakePlaybackState({ status: 'stopped', tickPosition: 0 }), true);
    expect(api.pause).not.toHaveBeenCalled();
    expect(api.tickPosition).toBe(0);
    expect(result).toBe(0);
  });

  it('resets tickPosition to 0 on a full Stop for a non-host too', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 5000 });
    const result = correctDrift(api, fakePlaybackState({ status: 'stopped', tickPosition: 0 }), false);
    expect(api.tickPosition).toBe(0);
    expect(result).toBe(0);
  });

  it('does not repeatedly reset once tickPosition is already 0 while stopped', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused, tickPosition: 0 });
    const result = correctDrift(api, fakePlaybackState({ status: 'stopped', tickPosition: 0 }), true);
    expect(result).toBeNull();
  });

  describe('tempo-invariant drift tolerance', () => {
    // The drift tolerance is a *perceptual* quantity, so it must be an
    // absolute real duration — the same millisecond budget at every tempo.
    // A fixed tick count is a fixed fraction of a beat, so its real
    // tolerance is 3125/bpm ms: 33.6ms at 93bpm vs 24.0ms at 130bpm across
    // the real catalogue's tempo range alone. These tests express drift in
    // milliseconds converted at the *score's own* tempo (the tempo
    // localTempoAtTick reads, not the display-only playbackState.bpm) and
    // assert the same real drift produces the same decision at both ends.
    const msToTicks = (ms: number, bpm: number) => (ms * bpm * 960) / 60000;

    // Paused non-host: extrapolation contributes 0 ticks, so the comparison
    // is drift = |api.tickPosition - playbackState.tickPosition| exactly.
    function driftByMs(ms: number, bpm: number) {
      const base = 10_000;
      const api = fakeApi({ playerState: at.synth.PlayerState.Paused, tickPosition: base + msToTicks(ms, bpm), score: fakeScore(bpm) });
      return correctDrift(api, fakePlaybackState({ status: 'paused', tickPosition: base, serverTimestamp: Date.now() }), false);
    }

    it('leaves a 30ms drift uncorrected at both 93bpm and 130bpm', () => {
      // 30ms is inside the new 35ms tolerance at every tempo. Under the old
      // fixed 50-tick threshold it was 44.6 ticks at 93bpm (uncorrected) but
      // 62.4 ticks at 130bpm (corrected) — the same real error treated
      // differently purely because of tempo.
      expect(driftByMs(30, 93)).toBeNull();
      expect(driftByMs(30, 130)).toBeNull();
    });

    it('corrects a 45ms drift at both 93bpm and 130bpm', () => {
      // 45ms is outside the 35ms tolerance at every tempo.
      expect(driftByMs(45, 93)).not.toBeNull();
      expect(driftByMs(45, 130)).not.toBeNull();
    });
  });

  describe('latency-compensated extrapolation', () => {
    const NOW = 1_000_000;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('corrects against the elapsed-time-projected tick position, not the raw stale value', () => {
      // 120bpm: 1 tick = 60000/(120*960) ms ≈ 0.52ms. 400ms elapsed ≈ 768
      // ticks, so the projected tick is ~1768. api sits 132 ticks ≈ 68.8ms
      // from the projection (exceeds the 35ms tolerance) but 900 ticks
      // ≈ 469ms from the raw value —
      // asserting the *applied* correction equals the projection (~1768),
      // not the raw playbackState.tickPosition (1000), proves the projection
      // feeds both the comparison and the assignment.
      const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 1900, score: fakeScore(120) });
      const playbackState = fakePlaybackState({ status: 'running', tickPosition: 1000, serverTimestamp: NOW - 400 });

      const result = correctDrift(api, playbackState, false);

      expect(result).not.toBeNull();
      expect(result).toBeCloseTo(1768, 0);
      expect(api.tickPosition).toBeCloseTo(1768, 0);
    });

    it('triggers a correction against the projected value that a raw-value comparison would have missed', () => {
      // 80ms elapsed at 120bpm ≈ 153.6 ticks. Raw drift |1040-1000|=40 ticks
      // is 20.8ms at this tempo, within the 35ms tolerance — a naive
      // raw-only comparison would NOT correct. Projected drift
      // |1040-(1000+153.6)|≈113.6 ticks ≈ 59.2ms exceeds it,
      // proving the projection (not the raw tickPosition) drives the decision.
      const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 1040, score: fakeScore(120) });
      const playbackState = fakePlaybackState({ status: 'running', tickPosition: 1000, serverTimestamp: NOW - 80 });

      const result = correctDrift(api, playbackState, false);

      expect(result).not.toBeNull();
      expect(result).toBeCloseTo(1153.6, 0);
    });

    it('skips correction for a small elapsed time that keeps the projected value within the drift threshold', () => {
      // 5ms elapsed at 120bpm ≈ 9.6 ticks. api sits 20.4 ticks ≈ 10.6ms from
      // the projected value (1000 + 9.6 ≈ 1009.6) — within the 35ms
      // tolerance — even though it would be outside that tolerance of a
      // hypothetical larger elapsed window, proving the small, real
      // elapsed-time projection is what's compared.
      const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 1030, score: fakeScore(120) });
      const playbackState = fakePlaybackState({ status: 'running', tickPosition: 1000, serverTimestamp: NOW - 5 });

      const result = correctDrift(api, playbackState, false);

      expect(result).toBeNull();
      expect(api.tickPosition).toBe(1030);
    });
  });
});

describe('installCountInCursorGuard', () => {
  // The guard needs the two player events plus countInVolume and the
  // customCursorHandler slot; everything else on the api is irrelevant to it.
  function guardedApi(countInVolume: number) {
    const handlers = { state: [] as ((e: { state: at.synth.PlayerState }) => void)[], position: [] as ((e: { isSeek: boolean }) => void)[] };
    const api = {
      countInVolume,
      customCursorHandler: undefined as unknown,
      playerStateChanged: { on: (h: (e: { state: at.synth.PlayerState }) => void) => handlers.state.push(h) },
      playerPositionChanged: { on: (h: (e: { isSeek: boolean }) => void) => handlers.position.push(h) },
    };
    installCountInCursorGuard(api as unknown as AlphaTabApi);
    const fireState = (state: at.synth.PlayerState) => handlers.state.forEach((h) => h({ state }));
    const firePosition = (isSeek: boolean) => handlers.position.forEach((h) => h({ isSeek }));
    return { handler: api.customCursorHandler as ReturnType<typeof cursorArgs>['handler'], fireState, firePosition };
  }

  // Minimal shapes for the cursor-handler call: a recording beat cursor and
  // the beatBounds path the handler dereferences for bar bounds.
  function cursorArgs() {
    const calls: { duration: number; x: number }[] = [];
    const setBoundsCalls: number[][] = [];
    const beatCursor = { transitionToX: (duration: number, x: number) => calls.push({ duration, x }), setBounds: (...args: number[]) => setBoundsCalls.push(args) };
    const beatBounds = { barBounds: { masterBarBounds: { visualBounds: { x: 5, y: 10, w: 80, h: 90 } } } };
    const handler = undefined as unknown as {
      placeBeatCursor: (c: typeof beatCursor, b: typeof beatBounds, startX: number) => void;
      transitionBeatCursor: (c: typeof beatCursor, b: typeof beatBounds, startX: number, nextX: number, duration: number, mode: at.midi.MidiTickLookupFindBeatResultCursorMode) => void;
    };
    return { calls, setBoundsCalls, beatCursor, beatBounds, handler };
  }

  it('degrades transitions to placements while the count-in window is open', () => {
    const { handler, fireState } = guardedApi(1);
    fireState(at.synth.PlayerState.Playing);
    const { calls, setBoundsCalls, beatCursor, beatBounds } = cursorArgs();
    handler.transitionBeatCursor(beatCursor, beatBounds, 100, 200, 500, at.midi.MidiTickLookupFindBeatResultCursorMode.ToNextBext);
    expect(calls).toEqual([{ duration: 0, x: 100 }]);
    expect(setBoundsCalls).toEqual([[100, 10, 1, 90]]);
  });

  it('animates again after the first non-seek position event (count-in over)', () => {
    const { handler, fireState, firePosition } = guardedApi(1);
    fireState(at.synth.PlayerState.Playing);
    firePosition(true); // the internal isSeek reset must NOT close the window
    const { calls: during, beatCursor: c1, beatBounds: b1 } = cursorArgs();
    handler.transitionBeatCursor(c1, b1, 100, 200, 500, at.midi.MidiTickLookupFindBeatResultCursorMode.ToNextBext);
    expect(during).toEqual([{ duration: 0, x: 100 }]);

    firePosition(false);
    const { calls: after, beatCursor: c2, beatBounds: b2 } = cursorArgs();
    handler.transitionBeatCursor(c2, b2, 100, 200, 500, at.midi.MidiTickLookupFindBeatResultCursorMode.ToNextBext);
    // ToNextBext doubles distance and duration, matching alphaTab's default handler.
    expect(after).toEqual([{ duration: 1000, x: 300 }]);
  });

  it('never suppresses when no count-in is configured', () => {
    const { handler, fireState } = guardedApi(0);
    fireState(at.synth.PlayerState.Playing);
    const { calls, beatCursor, beatBounds } = cursorArgs();
    handler.transitionBeatCursor(beatCursor, beatBounds, 100, 200, 500, at.midi.MidiTickLookupFindBeatResultCursorMode.ToEndOfBeat);
    expect(calls).toEqual([{ duration: 500, x: 200 }]);
  });

  it('re-opens the window on every fresh Playing transition with count-in on', () => {
    const { handler, fireState, firePosition } = guardedApi(1);
    fireState(at.synth.PlayerState.Playing);
    firePosition(false); // playback ran; window closed
    fireState(at.synth.PlayerState.Paused);
    fireState(at.synth.PlayerState.Playing); // resume → new count-in
    const { calls, beatCursor, beatBounds } = cursorArgs();
    handler.transitionBeatCursor(beatCursor, beatBounds, 40, 60, 300, at.midi.MidiTickLookupFindBeatResultCursorMode.ToEndOfBeat);
    expect(calls).toEqual([{ duration: 0, x: 40 }]);
  });
});

describe('applyPlaybackSettings', () => {
  function fakeSession(overrides: Partial<Session> = {}): Session {
    return {
      code: 'ABCD',
      selectedSong: null,
      availableParts: [],
      participants: [],
      hostId: 'p1',
      playbackState: fakePlaybackState(),
      countInEnabled: false,
      lobbyCursorTick: null,
      spotlightMode: false,
      pendingHostRequest: null,
      unlockedCatalogueIds: [],
      ...overrides,
    };
  }

  it('sets countInVolume from the session flag when enabled', () => {
    const api = fakeApi();
    applyPlaybackSettings(api, fakeSession({ countInEnabled: true }));
    expect(api.countInVolume).toBe(1);
  });

  it('sets countInVolume to 0 when disabled, and never touches metronomeVolume (a client-local preference)', () => {
    const api = fakeApi();
    const before = api.metronomeVolume;
    applyPlaybackSettings(api, fakeSession({ countInEnabled: false }));
    expect(api.countInVolume).toBe(0);
    expect(api.metronomeVolume).toBe(before);
  });
});
