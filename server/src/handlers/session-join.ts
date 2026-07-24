import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { visibleCatalog } from '../catalog-loader.js';
import { seedHostMembershipUnlocks } from '../membership-unlock.js';
import { promoteNextHost } from '../host-succession.js';
import { sendOwnerVisibleCatalog } from '../owner-visibility.js';
import { validateDisplayName } from '../input-validation.js';
import { isValidJoinCodeFormat } from '../session-store.js';

export function handleSessionJoin(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'session-join' }>): void {
  const displayNameResult = validateDisplayName(message.displayName);
  if (!displayNameResult.ok) {
    ctx.connections.send(socket, { type: 'error', message: 'Display name is invalid' });
    return;
  }
  const displayName = displayNameResult.value;

  // T006: join-code format audit — a code that can't possibly match a real
  // session (wrong length, or a character outside the generated alphabet,
  // e.g. the visually-ambiguous I/O/0/1 the generator never produces) is
  // rejected the same way a well-formed-but-nonexistent code always was:
  // the typed session-not-found terminal signal (F001), not a new error
  // shape — this only short-circuits the store lookup, it doesn't change
  // the client-observable behavior.
  if (!isValidJoinCodeFormat(message.code)) {
    ctx.connections.send(socket, { type: 'session-not-found', code: message.code });
    return;
  }

  const session = ctx.sessionStore.get(message.code);
  if (!session) {
    // Typed terminal signal (F001) rather than a stringly-typed `error`: the
    // client can treat `session-not-found` as unconditionally terminal (clear
    // the stale stored session + stop reconnecting) without inferring intent
    // from an error string plus its own `session === null` guess.
    ctx.connections.send(socket, { type: 'session-not-found', code: message.code });
    return;
  }

  // Reclaim an existing (likely disconnected) participant by its persisted
  // id, e.g. after a page refresh — rather than always minting a new one.
  // Without this, a refreshing host would silently lose host control:
  // Session.hostId would keep pointing at the old, now-permanently-
  // disconnected participant.
  const existing = message.participantId ? session.participants.find((p) => p.id === message.participantId) : undefined;

  // Peek (not consume) — `attach` below still does the real, consuming read
  // that seeds ConnectionInfo.userId (T007: peer-visible identity on the wire).
  const userId = ctx.connections.peekPendingUserId(socket);

  let participantId: string;
  if (existing) {
    participantId = existing.id;
    existing.displayName = displayName;
    existing.connectionStatus = 'connected';
    // The participant's own renderer/headless instance is gone after a
    // refresh (fresh page load) — their part choice is kept, but readiness
    // must re-derive from scratch rather than stay stale at 'ready'.
    existing.readiness = 'no-part';
    // Refresh the wire-visible userId too — a reconnect may now be signed in
    // (or signed out) compared to the original join.
    existing.userId = userId;

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
      displayName,
      role: 'member',
      connectionStatus: 'connected',
      selectedPart: null,
      readiness: 'no-part',
      joinedAt: Date.now(),
      userId,
    });
  }

  ctx.connections.attach(socket, { sessionCode: session.code, participantId });
  ctx.sessionStore.markActive(session.code);

  // Absent-host check (infrastructure.md Host Succession): if this join lands
  // in a session whose hostId points at a disconnected participant, schedule
  // host reassignment. The disconnect-time timer doesn't cover this — with the
  // hours-long empty-session TTL a member can rejoin long after everyone left,
  // and without this check the absent host would keep hostId forever.
  // scheduleHostReassignment is a no-op if a timer is already pending, and a
  // host reclaiming their own seat was set 'connected' above (and cancelled
  // any pending timer), so this only arms for a genuinely absent host.
  const host = session.participants.find((p) => p.id === session.hostId);
  if (host && host.connectionStatus === 'disconnected') {
    ctx.sessionStore.scheduleHostReassignment(session.code, () => promoteNextHost(ctx, session.code));
  }
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
  ctx.connections.send(socket, { type: 'catalog', ...visibleCatalog(ctx.catalog, session) });

  // Host-only membership auto-unlock (T014): fires only if this joiner IS the
  // session host (e.g. the host reconnecting/reclaiming their seat) — a normal
  // member join is a no-op inside the helper. Best-effort/async (§13 S7).
  void seedHostMembershipUnlocks(ctx, session.code, socket);

  // Per-user ownership visibility (T006): any signed-in owner (host or member,
  // unlike the host-only unlock above) sees their own not-yet-unlocked-by-
  // anyone catalogue. Best-effort/async, follow-up send to this socket only.
  void sendOwnerVisibleCatalog(ctx, socket, session, ctx.connections.get(socket)?.userId ?? null);
}
