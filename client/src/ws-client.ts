import type { ClientMessage, ServerMessage } from '@sync-tab-scroll/shared';
import { clientStore } from './store';

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
      clientStore.update((s) => ({ ...s, session: message.session, selfParticipantId: message.selfParticipantId }));
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
