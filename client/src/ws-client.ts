import { get } from 'svelte/store';
import type { ClientMessage, ServerMessage } from '@sync-tab-scroll/shared';
import { clientStore } from './store';
import { toastStore } from './toast-store';

export interface WsClient {
  send(message: ClientMessage): void;
  close(): void;
}

/** Real WS connection state (constitution Principle VI, one named type — `ClientState.connectionStatus` reads this same type rather than retyping it inline). `'disconnected'` covers both "never connected yet" and "connected, then dropped" — `ConnectionBanner.svelte` treats both identically. */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * Connects to the server and updates the single client store as ServerMessages arrive.
 *
 * Reconnects on drop/failure with a fixed retry interval (constitution: no
 * backoff, this app runs at self-hosted/small-group scale where a simple
 * fixed interval is sufficient) and never gives up — the banner this drives
 * (ConnectionBanner.svelte) is meant to stay visible until contact is
 * restored, however long that takes.
 */
export function createWsClient(url: string, reconnectDelayMs = 2000): WsClient {
  const pending: ClientMessage[] = [];
  // Reassigned on every reconnect attempt — `send` and the message handlers
  // below always read this variable, so the returned WsClient object's
  // identity (and clientStore.wsClient) never needs to change.
  let socket: WebSocket;
  // False only for the very first open — the caller's own connect() already
  // sends session-create/session-join for that one. Every later open is a
  // reconnect after a drop, where the server has no memory of this socket at
  // all, so re-sending session-join is what reattaches it to the
  // participant record via session-join.ts's existing reclaim-by-id branch
  // (the same path used for page-refresh reconnects) — no second mechanism.
  let hasOpenedBefore = false;

  function attachSocket() {
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      clientStore.update((s) => ({ ...s, connectionStatus: 'connected' }));

      if (hasOpenedBefore) {
        const state = get(clientStore);
        const displayName = state.session?.participants.find((p) => p.id === state.selfParticipantId)?.displayName;
        if (state.session && state.selfParticipantId && displayName) {
          // Sent ahead of the pending flush below — a message queued during
          // the outage must not reach the server before this reattaches the
          // socket to its participant.
          socket.send(
            JSON.stringify({ type: 'session-join', code: state.session.code, participantId: state.selfParticipantId, displayName }),
          );
        }
      }
      hasOpenedBefore = true;

      for (const message of pending.splice(0)) socket.send(JSON.stringify(message));
    });

    // A socket that never connects at all (server down) fires both 'error'
    // and 'close'; a socket that drops after connecting fires only 'close'
    // (browsers don't fire 'error' for a clean-ish server-side close).
    // Scheduling the retry from 'close' alone — since it always fires,
    // after 'error' — avoids double-scheduling a retry per failure.
    socket.addEventListener('error', () => {
      clientStore.update((s) => ({ ...s, connectionStatus: 'disconnected' }));
    });
    socket.addEventListener('close', () => {
      clientStore.update((s) => ({ ...s, connectionStatus: 'disconnected' }));
      setTimeout(attachSocket, reconnectDelayMs);
    });

    socket.addEventListener('message', (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.type === 'session-state') {
        clientStore.update((s) => {
          // View transitions (ui.md): landing -> lobby once a session exists,
          // lobby -> playback once the host has actually started playback —
          // driven from here since every session-state update passes through
          // this one place, rather than being duplicated per view.
          let view = s.view;
          if (view === 'landing') view = 'lobby';
          else if (view === 'lobby' && message.session.playbackState.status === 'running') view = 'playback';
          // A host 'stop' (not 'pause', which stays in Playback) sends
          // everyone back to the Lobby — the only reverse transition; there's
          // no other path out of Playback once entered.
          else if (view === 'playback' && message.session.playbackState.status === 'stopped') view = 'lobby';
          return { ...s, view, session: message.session, selfParticipantId: message.selfParticipantId };
        });
      } else if (message.type === 'catalog') {
        clientStore.update((s) => ({ ...s, catalog: message.songs }));
      } else if (message.type === 'error') {
        // Errors (join-by-code failure, part-not-found, not-host attempts) are toasts, not blocking modals (ui.md States).
        toastStore.push(message.message);
      }
    });
  }

  attachSocket();

  return {
    send(message: ClientMessage) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        pending.push(message);
      }
    },
    close() {
      socket.close();
    },
  };
}

/**
 * Single connection entry point (constitution Principle III) — creates the
 * one WsClient every view reads through `clientStore.wsClient`, instead of
 * each view opening its own socket and session independently.
 */
export function connect(displayName: string, joinCode?: string, participantId?: string): void {
  // VITE_BACKEND_PORT lets dev (6080) and e2e (6081) point the built client
  // at different backend instances without touching source per environment
  // (client/vite.config.ts sets the matching default for its /catalog proxy).
  const backendPort = import.meta.env.VITE_BACKEND_PORT ?? '6080';
  const wsClient = createWsClient(`ws://${location.hostname}:${backendPort}`);
  clientStore.update((s) => ({ ...s, wsClient }));
  if (joinCode) {
    wsClient.send({ type: 'session-join', code: joinCode, displayName, participantId });
  } else {
    wsClient.send({ type: 'session-create', displayName });
  }
}
