import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientStore } from './store';
import { STORAGE_KEY } from './session-persistence';
import { leaveSession } from './leave-session';
import type { WsClient } from './ws-client';

function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
});

describe('leaveSession', () => {
  it('closes the wsClient, clears stored session state, and resets clientStore to its initial shape', () => {
    const close = vi.fn();
    const fakeWsClient: WsClient & { close: () => void } = { send: vi.fn(), close };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: 'ABCD', displayName: 'Alice', participantId: 'p1' }));
    clientStore.set({
      view: 'playback',
      session: {
        code: 'ABCD',
        selectedSong: null,
        availableParts: [],
        participants: [],
        hostId: 'p1',
        playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
        countInEnabled: false,
        playbackSource: 'synth',
        lobbyCursorTick: null,
        spotlightMode: false,
        pendingHostRequest: null,
        unlockedCatalogueIds: [],
        hostBarsPerRow: null,
        earlyStopTick: null,
      },
      selfParticipantId: 'p1',
      catalog: [], catalogues: [],
      wsClient: fakeWsClient,
      playbackProgress: 0.5,
      engineReady: true,
      startConfirmationOpen: false,
      hostStartPendingOpen: false,
      lyricsOverlayVisible: true,
      connectionStatus: 'connected',
    });

    leaveSession();

    expect(close).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    let state: unknown;
    clientStore.subscribe((s) => (state = s))();
    expect(state).toEqual({
      view: 'landing',
      session: null,
      selfParticipantId: null,
      catalog: [], catalogues: [],
      wsClient: null,
      playbackProgress: 0,
      engineReady: false,
    startConfirmationOpen: false,
    hostStartPendingOpen: false,
      lyricsOverlayVisible: true,
      connectionStatus: 'connecting',
    });
  });

  it('is a no-op-safe call when there is no active wsClient', () => {
    clientStore.set({
      view: 'landing',
      session: null,
      selfParticipantId: null,
      catalog: [], catalogues: [],
      wsClient: null,
      playbackProgress: 0,
      engineReady: false,
    startConfirmationOpen: false,
    hostStartPendingOpen: false,
      lyricsOverlayVisible: true,
      connectionStatus: 'connecting',
    });
    expect(() => leaveSession()).not.toThrow();
  });
});
