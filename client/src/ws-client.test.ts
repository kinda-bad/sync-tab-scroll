import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '@sync-tab-scroll/shared';
import { clientStore } from './store';
import { STORAGE_KEY } from './session-persistence';
import { toastStore } from './toast-store';
import { createWsClient } from './ws-client';

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

/**
 * Minimal WebSocket double — only the surface ws-client.ts actually uses
 * (addEventListener/close/readyState). `close()` fires its 'close'
 * listeners synchronously (unlike a real socket, which is asynchronous)
 * specifically so this test can assert, right after calling `close()`,
 * whether a reconnect got scheduled — that ordering is exactly what the
 * `suppressReconnect` flag under test controls.
 */
class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.OPEN;
  closeCalls = 0;
  private listeners: Record<string, ((event?: unknown) => void)[]> = {};

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: (event?: unknown) => void) {
    (this.listeners[type] ??= []).push(cb);
  }

  removeEventListener() {}

  send() {}

  close() {
    this.closeCalls++;
    this.listeners['close']?.forEach((cb) => cb());
  }

  dispatch(type: string, event?: unknown) {
    this.listeners[type]?.forEach((cb) => cb(event));
  }
}

function baseSession(participants: Session['participants']): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants,
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
  };
}

const hostParticipant = { id: 'host-1', displayName: 'Host', role: 'host' as const, connectionStatus: 'connected' as const, selectedPart: null, readiness: 'no-part' as const, joinedAt: 0 };
const selfParticipant = { id: 'p1', displayName: 'Member', role: 'member' as const, connectionStatus: 'connected' as const, selectedPart: null, readiness: 'no-part' as const, joinedAt: 1 };

beforeEach(() => {
  (globalThis as unknown as { localStorage: ReturnType<typeof fakeLocalStorage> }).localStorage = fakeLocalStorage();
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
  FakeWebSocket.instances = [];
});

afterEach(() => {
  // Prevent any accidental setTimeout(attachSocket, ...) scheduled by a
  // buggy implementation from firing into a later test.
  FakeWebSocket.instances = [];
});

describe('ws-client self-removal detection', () => {
  it('toasts, clears stored session, resets clientStore, and closes without scheduling a reconnect when a session-state broadcast no longer contains this participant', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: 'ABCD', displayName: 'Member', participantId: 'p1' }));
    clientStore.set({
      view: 'lobby',
      session: baseSession([hostParticipant, selfParticipant]),
      selfParticipantId: 'p1',
      catalog: [],
      wsClient: null,
      playbackProgress: 0,
      engineReady: false,
      connectionStatus: 'connected',
    });

    createWsClient('ws://test');
    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();

    socket.dispatch('message', {
      data: JSON.stringify({
        type: 'session-state',
        session: baseSession([hostParticipant]),
        selfParticipantId: 'p1',
      }),
    });

    let toasts: { message: string }[] = [];
    toastStore.subscribe((t) => (toasts = t))();
    expect(toasts.some((t) => t.message === 'You were removed from the session by the host')).toBe(true);

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    let state: unknown;
    clientStore.subscribe((s) => (state = s))();
    expect(state).toEqual({
      view: 'landing',
      session: null,
      selfParticipantId: null,
      catalog: [],
      wsClient: null,
      playbackProgress: 0,
      engineReady: false,
      connectionStatus: 'connecting',
    });

    expect(socket.closeCalls).toBe(1);
    // No reconnect scheduled: closing this fake synchronously invoked the
    // 'close' listener above, which would otherwise have created a second
    // FakeWebSocket instance via setTimeout(attachSocket, ...).
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('does not treat an ordinary session-state update (self still present) as a removal', () => {
    clientStore.set({
      view: 'lobby',
      session: baseSession([hostParticipant, selfParticipant]),
      selfParticipantId: 'p1',
      catalog: [],
      wsClient: null,
      playbackProgress: 0,
      engineReady: false,
      connectionStatus: 'connected',
    });

    createWsClient('ws://test');
    const socket = FakeWebSocket.instances[0];

    socket.dispatch('message', {
      data: JSON.stringify({
        type: 'session-state',
        session: baseSession([hostParticipant, selfParticipant]),
        selfParticipantId: 'p1',
      }),
    });

    let state: { view: string; selfParticipantId: string | null } | undefined;
    clientStore.subscribe((s) => (state = s))();
    expect(state?.view).toBe('lobby');
    expect(state?.selfParticipantId).toBe('p1');
    expect(socket.closeCalls).toBe(0);
  });
});
