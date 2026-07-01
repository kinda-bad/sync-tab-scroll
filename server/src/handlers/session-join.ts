import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

export function handleSessionJoin(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'session-join' }>): void {
  const session = ctx.sessionStore.get(message.code);
  if (!session) {
    ctx.connections.send(socket, { type: 'error', message: `Session ${message.code} not found` });
    return;
  }

  const participantId = crypto.randomUUID();
  session.participants.push({
    id: participantId,
    displayName: message.displayName,
    role: 'member',
    connectionStatus: 'connected',
    selectedPart: null,
    readiness: 'no-part',
  });

  ctx.connections.attach(socket, { sessionCode: session.code, participantId });
  ctx.sessionStore.markActive(session.code);
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
