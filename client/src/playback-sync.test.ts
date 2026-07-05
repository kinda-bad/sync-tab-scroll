import { describe, expect, it, vi } from 'vitest';
import * as at from '@coderline/alphatab';
import type { AlphaTabApi } from '@coderline/alphatab';
import type { PlaybackState, Session } from '@sync-tab-scroll/shared';
import { applyPlaybackSettings, correctDrift, installCountInCursorGuard } from './playback-sync';

function fakeApi(overrides: Partial<{ isReadyForPlayback: boolean; tickPosition: number; playerState: at.synth.PlayerState }> = {}) {
  return {
    isReadyForPlayback: true,
    tickPosition: 0,
    playerState: at.synth.PlayerState.Paused,
    play: vi.fn(),
    pause: vi.fn(),
    metronomeVolume: 0,
    countInVolume: 0,
    ...overrides,
  } as unknown as AlphaTabApi & { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> };
}

function fakePlaybackState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0, ...overrides };
}

describe('correctDrift', () => {
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
