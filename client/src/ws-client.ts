import type { ClientMessage, ServerMessage } from '@sync-tab-scroll/shared';
import { clientStore } from './store';
import { toastStore } from './toast-store';

export interface WsClient {
  send(message: ClientMessage): void;
}

/** Connects to the server and updates the single client store as ServerMessages arrive. */
export function createWsClient(url: string): WsClient {
  const socket = new WebSocket(url);
  const pending: ClientMessage[] = [];

  socket.addEventListener('open', () => {
    for (const message of pending.splice(0)) socket.send(JSON.stringify(message));
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
        return { ...s, view, session: message.session, selfParticipantId: message.selfParticipantId };
      });
    } else if (message.type === 'catalog') {
      clientStore.update((s) => ({ ...s, catalog: message.songs }));
    } else if (message.type === 'error') {
      // Errors (join-by-code failure, part-not-found, not-host attempts) are toasts, not blocking modals (ui.md States).
      toastStore.push(message.message);
    }
  });

  return {
    send(message: ClientMessage) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        pending.push(message);
      }
    },
  };
}

/**
 * Single connection entry point (constitution Principle III) — creates the
 * one WsClient every view reads through `clientStore.wsClient`, instead of
 * each view opening its own socket and session independently.
 */
export function connect(displayName: string, joinCode?: string, participantId?: string): void {
  const wsClient = createWsClient(`ws://${location.hostname}:8080`);
  clientStore.update((s) => ({ ...s, wsClient }));
  if (joinCode) {
    wsClient.send({ type: 'session-join', code: joinCode, displayName, participantId });
  } else {
    wsClient.send({ type: 'session-create', displayName });
  }
}
