import { describe, expect, it, vi } from 'vitest';
import * as at from '@coderline/alphatab';
import type { AlphaTabApi } from '@coderline/alphatab';
import type { PlaybackState, Session } from '@sync-tab-scroll/shared';
import { applyPlaybackSettings, correctDrift } from './playback-sync';

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
    const result = correctDrift(api, fakePlaybackState({ tickPosition: 500 }));
    expect(result).toBeNull();
    expect(api.tickPosition).toBe(100);
  });

  it('starts playback when running and not yet playing', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Paused });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 777 }));
    expect(api.tickPosition).toBe(777);
    expect(api.play).toHaveBeenCalledOnce();
    expect(result).toBe(777);
  });

  it('pauses when not running but still playing', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 300 });
    const result = correctDrift(api, fakePlaybackState({ status: 'paused', tickPosition: 300 }));
    expect(api.pause).toHaveBeenCalledOnce();
    expect(result).toBeNull();
  });

  it('snaps and returns the applied tick when drift exceeds the threshold', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 0 });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 1000 }));
    expect(api.tickPosition).toBe(1000);
    expect(result).toBe(1000);
  });

  it('returns null and leaves tickPosition alone when drift is within the threshold', () => {
    const api = fakeApi({ playerState: at.synth.PlayerState.Playing, tickPosition: 1000 });
    const result = correctDrift(api, fakePlaybackState({ status: 'running', tickPosition: 1010 }));
    expect(api.tickPosition).toBe(1000);
    expect(result).toBeNull();
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
      metronomeEnabled: false,
      lobbyCursorTick: null,
      spotlightMode: false,
      ...overrides,
    };
  }

  it('sets metronomeVolume/countInVolume from session flags when enabled', () => {
    const api = fakeApi();
    applyPlaybackSettings(api, fakeSession({ metronomeEnabled: true, countInEnabled: true }));
    expect(api.metronomeVolume).toBe(1);
    expect(api.countInVolume).toBe(1);
  });

  it('sets metronomeVolume/countInVolume to 0 when disabled', () => {
    const api = fakeApi();
    applyPlaybackSettings(api, fakeSession({ metronomeEnabled: false, countInEnabled: false }));
    expect(api.metronomeVolume).toBe(0);
    expect(api.countInVolume).toBe(0);
  });
});
