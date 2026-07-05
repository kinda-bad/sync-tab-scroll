import { get } from 'svelte/store';
import { clientStore } from './store';
import { clearStoredSession } from './session-persistence';

/**
 * Leaves the current session: closes the connection, clears the persisted
 * identity, and resets clientStore to its exact initial shape (store.ts) so
 * the Landing view can join/create fresh. No server-side "left" notification
 * — this reuses the existing disconnect path (server.ts's WS close handler
 * already runs readiness/host-succession cleanup), not a new protocol message.
 */
export function leaveSession(): void {
  get(clientStore).wsClient?.close();
  clearStoredSession();
  clientStore.set({
    view: 'landing',
    session: null,
    selfParticipantId: null,
    catalog: [],
    wsClient: null,
    playbackProgress: 0,
    engineReady: false,
  });
}
