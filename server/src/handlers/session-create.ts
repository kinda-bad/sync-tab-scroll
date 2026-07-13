import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { visibleCatalog } from '../catalog-loader.js';
import { seedHostMembershipUnlocks } from '../membership-unlock.js';

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
  ctx.connections.send(socket, { type: 'catalog', ...visibleCatalog(ctx.catalog, session) });

  // Host-only membership auto-unlock (T014): if the creator is a logged-in user,
  // seed their epoch-current catalogue memberships and re-broadcast the pair.
  // Best-effort/async — the synchronous session-state/catalog above already went
  // out, so a null/failing store just means no extra unlock (§13 S7).
  void seedHostMembershipUnlocks(ctx, session.code, socket);
}
