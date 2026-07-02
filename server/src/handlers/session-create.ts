import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

export function handleSessionCreate(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'session-create' }>): void {
  const hostId = crypto.randomUUID();
  const session = ctx.sessionStore.create(hostId);
  session.participants.push({
    id: hostId,
    displayName: message.displayName,
    role: 'host',
    connectionStatus: 'connected',
    selectedPart: null,
    readiness: 'no-part',
    joinedAt: Date.now(),
  });

  ctx.connections.attach(socket, { sessionCode: session.code, participantId: hostId });
  ctx.connections.send(socket, { type: 'session-state', session, selfParticipantId: hostId });
  ctx.connections.send(socket, { type: 'catalog', songs: ctx.catalog });
}
