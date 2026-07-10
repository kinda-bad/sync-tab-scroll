import { beforeEach, describe, expect, it } from 'vitest';
import { clientStore } from './store';
import { loadStoredSession, startSessionPersistence, STORAGE_KEY, type StoredSession } from './session-persistence';

function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  clientStore.set({
    view: 'landing',
    session: null,
    selfParticipantId: null,
    catalog: [],
    wsClient: null,
    playbackProgress: 0,
    engineReady: false,
    connectionStatus: 'connected',
  });
});

describe('loadStoredSession', () => {
  it('returns undefined when nothing is stored', () => {
    expect(loadStoredSession()).toBeUndefined();
  });

  it('round-trips a previously-stored session', () => {
    const stored: StoredSession = { code: 'ABCD', displayName: 'Alice', participantId: 'p1' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    expect(loadStoredSession()).toEqual(stored);
  });
});

describe('startSessionPersistence', () => {
  it('does not write to localStorage before a session/selfParticipantId exist', () => {
    startSessionPersistence();
    expect(loadStoredSession()).toBeUndefined();
  });

  it('writes {code, displayName, participantId} once session and selfParticipantId are set and the participant is found', () => {
    startSessionPersistence();

    clientStore.set({
      view: 'lobby',
      session: {
        code: 'WXYZ',
        selectedSong: null,
        availableParts: [],
        participants: [{ id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 }],
        hostId: 'p1',
        playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
        countInEnabled: false,
        lobbyCursorTick: null,
        spotlightMode: false,
        pendingHostRequest: null,
        unlockedCatalogueIds: [],
      },
      selfParticipantId: 'p1',
      catalog: [],
      wsClient: null,
      playbackProgress: 0,
      engineReady: false,
      connectionStatus: 'connected',
    });

    expect(loadStoredSession()).toEqual({ code: 'WXYZ', displayName: 'Alice', participantId: 'p1' });
  });
});
