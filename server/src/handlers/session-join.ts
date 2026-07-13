import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { visibleCatalog } from '../catalog-loader.js';
import { seedHostMembershipUnlocks } from '../membership-unlock.js';

export function handleSessionJoin(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'session-join' }>): void {
  const session = ctx.sessionStore.get(message.code);
  if (!session) {
    ctx.connections.send(socket, { type: 'error', message: `Session ${message.code} not found` });
    return;
  }

  // Reclaim an existing (likely disconnected) participant by its persisted
  // id, e.g. after a page refresh — rather than always minting a new one.
  // Without this, a refreshing host would silently lose host control:
  // Session.hostId would keep pointing at the old, now-permanently-
  // disconnected participant.
  const existing = message.participantId ? session.participants.find((p) => p.id === message.participantId) : undefined;

  let participantId: string;
  if (existing) {
    participantId = existing.id;
    existing.displayName = message.displayName;
    existing.connectionStatus = 'connected';
    // The participant's own renderer/headless instance is gone after a
    // refresh (fresh page load) — their part choice is kept, but readiness
    // must re-derive from scratch rather than stay stale at 'ready'.
    existing.readiness = 'no-part';

    // The host reconnecting within the grace period cancels any pending
    // succession (infrastructure.md Host Succession) — note this checks
    // Session.hostId, not existing.role, since a promoted host's role was
    // already flipped to 'host' and the demoted original host's role to
    // 'member' if succession already fired; only a same-hostId reconnect
    // should cancel a still-pending timer.
    if (existing.id === session.hostId) ctx.sessionStore.cancelHostReassignment(session.code);
  } else {
    participantId = crypto.randomUUID();
    session.participants.push({
      id: participantId,
      displayName: message.displayName,
      role: 'member',
      connectionStatus: 'connected',
      selectedPart: null,
      readiness: 'no-part',
      joinedAt: Date.now(),
    });
  }

  ctx.connections.attach(socket, { sessionCode: session.code, participantId });
  ctx.sessionStore.markActive(session.code);
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
  ctx.connections.send(socket, { type: 'catalog', ...visibleCatalog(ctx.catalog, session) });

  // Host-only membership auto-unlock (T014): fires only if this joiner IS the
  // session host (e.g. the host reconnecting/reclaiming their seat) — a normal
  // member join is a no-op inside the helper. Best-effort/async (§13 S7).
  void seedHostMembershipUnlocks(ctx, session.code, socket);
}
