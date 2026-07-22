import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { visibleCatalog } from '../catalog-loader.js';
import { seedHostMembershipUnlocks } from '../membership-unlock.js';
import { sendOwnerVisibleCatalog } from '../owner-visibility.js';

export function handleSessionCreate(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'session-create' }>): void {
  const hostId = crypto.randomUUID();
  const session = ctx.sessionStore.create(hostId);

  // Dev convenience only (ServerConfig.devUnlockAllCatalogues) — skips the
  // activation-key prompt entirely for local development.
  if (ctx.devUnlockAllCatalogues) {
    session.unlockedCatalogueIds = ctx.catalog.catalogues.filter((c) => !c.public).map((c) => c.id);
  }

  session.participants.push({
    id: hostId,
    displayName: message.displayName,
    role: 'host',
    connectionStatus: 'connected',
    selectedPart: null,
    readiness: 'no-part',
    joinedAt: Date.now(),
    // Peek (not consume) — `attach` below still does the real, consuming read
    // that seeds ConnectionInfo.userId (T007: peer-visible identity on the wire).
    userId: ctx.connections.peekPendingUserId(socket),
  });

  ctx.connections.attach(socket, { sessionCode: session.code, participantId: hostId });
  ctx.connections.send(socket, { type: 'session-state', session, selfParticipantId: hostId });
  ctx.connections.send(socket, { type: 'catalog', ...visibleCatalog(ctx.catalog, session) });

  // Host-only membership auto-unlock (T014): if the creator is a logged-in user,
  // seed their epoch-current catalogue memberships and re-broadcast the pair.
  // Best-effort/async — the synchronous session-state/catalog above already went
  // out, so a null/failing store just means no extra unlock (§13 S7).
  void seedHostMembershipUnlocks(ctx, session.code, socket);

  // Per-user ownership visibility (T006): the creator sees their own
  // not-yet-unlocked-by-anyone catalogue if they own one. Best-effort/async,
  // follow-up send to this socket only.
  void sendOwnerVisibleCatalog(ctx, socket, session, ctx.connections.get(socket)?.userId ?? null);
}
