import { get } from 'svelte/store';
import type { ClientMessage, ServerMessage } from '@sync-tab-scroll/shared';
import { clientStore } from './store';
import { toastStore } from './toast-store';
import { clearStoredSession } from './session-persistence';

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
  // Set true only when this client detects it was just removed from the
  // session by the host (session-state handler below) — this client's own
  // socket is being closed deliberately, so the 'close' listener's usual
  // reconnect-and-rejoin behavior must not fire (it would just rejoin the
  // session this participant was just removed from).
  let suppressReconnect = false;

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
      if (!suppressReconnect) setTimeout(attachSocket, reconnectDelayMs);
    });

    socket.addEventListener('message', (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.type === 'session-state') {
        // Self-removal detection (infrastructure.md host-remove-participant):
        // every session-state broadcast passes through here, including the
        // one a just-removed participant's own still-attached socket
        // receives (ConnectionRegistry.broadcast builds it from that
        // socket's own conn.participantId) — it just won't find itself in
        // the participant list anymore. The current store's
        // selfParticipantId check is an idempotency guard: it's cleared by
        // the reset below, so this only fires once per removal.
        const current = get(clientStore);
        const wasRemoved =
          current.selfParticipantId !== null &&
          message.selfParticipantId === current.selfParticipantId &&
          !message.session.participants.some((p) => p.id === current.selfParticipantId);

        if (wasRemoved) {
          toastStore.push('You were removed from the session by the host');
          suppressReconnect = true;
          // Not leaveSession() itself — it calls wsClient?.close(), which
          // would re-enter this same 'close' listener from within this
          // message handler. Closing directly and mirroring (not calling)
          // leaveSession's reset shape avoids that reentrancy.
          socket.close();
          clearStoredSession();
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
            connectionStatus: 'connecting',
            lyricsOverlayVisible: true,
          });
          return;
        }

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
      } else if (message.type === 'start-confirmation-needed') {
        // Start negotiation (ui.md Explicit Readiness): opens the host's
        // "start anyway?" modal. The live not-ready count is derived from
        // session-state broadcasts, not this one-shot message.
        clientStore.update((s) => ({ ...s, startConfirmationOpen: true }));
      } else if (message.type === 'host-start-pending') {
        clientStore.update((s) => ({ ...s, hostStartPendingOpen: true }));
      } else if (message.type === 'host-start-resolved') {
        // Auto-dismisses the participant's modal whichever way the host
        // answered (started true or false alike).
        clientStore.update((s) => ({ ...s, hostStartPendingOpen: false, startConfirmationOpen: false }));
      } else if (message.type === 'catalog') {
        clientStore.update((s) => ({ ...s, catalog: message.songs, catalogues: message.catalogues }));
      } else if (message.type === 'session-not-found') {
        // The server — the authority on whether a session exists — says this
        // session is gone (feedback F001). UNCONDITIONALLY terminal, regardless
        // of whether this client's own store still holds a (non-null) session:
        // a persisted stale session that reconnect-rejoins (the open handler
        // above) storms the 2s rejoin loop forever, resetting the
        // HTTP/2-coalesced connection and aborting in-flight fetches (the
        // confirmed sign-out aborter). This replaces F002's `session === null`
        // heuristic in the `error` handler, which could never terminate a
        // non-null stale session. Reuses the host-removal terminal-socket shape
        // (the wasRemoved branch above) — one terminal mechanism, not a second.
        toastStore.push(`Session ${message.code} not found`);
        suppressReconnect = true;
        socket.close();
        clearStoredSession();
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
          connectionStatus: 'connecting',
          lyricsOverlayVisible: true,
        });
      } else if (message.type === 'error') {
        // Errors (part-not-found, not-host attempts) are toasts, not blocking
        // modals (ui.md States). A dead-session join now arrives as the typed
        // `session-not-found` above, so this handler is toast-only again.
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
 * Builds the WS URL to connect to (infrastructure.md "Deployment (Railway +
 * Terraform)" — Client WS connection gains a same-origin production mode).
 *
 * VITE_BACKEND_PORT lets dev (6080) and e2e (6081) point the built client
 * at a separate backend instance on an explicit port, without touching
 * source per environment (client/vite.config.ts sets the matching default
 * for its /catalog proxy). When it's unset — the production build, e.g. on
 * Railway, where the server serves the client build itself on one
 * Railway-assigned port — connect same-origin instead, matching the page's
 * own protocol (wss: under https:, ws: under http:) with no explicit port.
 */
export function buildWsUrl(): string {
  const backendPort = import.meta.env.VITE_BACKEND_PORT;
  if (backendPort) return `ws://${location.hostname}:${backendPort}`;
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}`;
}

/**
 * Single connection entry point (constitution Principle III) — creates the
 * one WsClient every view reads through `clientStore.wsClient`, instead of
 * each view opening its own socket and session independently.
 */
export function connect(displayName: string, joinCode?: string, participantId?: string): void {
  const wsClient = createWsClient(buildWsUrl());
  clientStore.update((s) => ({ ...s, wsClient }));
  if (joinCode) {
    wsClient.send({ type: 'session-join', code: joinCode, displayName, participantId });
  } else {
    wsClient.send({ type: 'session-create', displayName });
  }
}
