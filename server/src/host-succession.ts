import type { Session } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './handlers/context.js';

/**
 * Moves host privileges to `toParticipantId`: the outgoing host (if any)
 * becomes a `'member'`, the target becomes `'host'`, and `Session.hostId`
 * is updated. This is the one shared implementation of that field swap —
 * used by `promoteNextHost` below and by the `host-delegate` handler
 * (infrastructure.md Host Transfer) — rather than each caller
 * reimplementing it independently (constitution Principle II).
 */
export function transferHost(session: Session, toParticipantId: string): void {
  const outgoingHost = session.participants.find((p) => p.id === session.hostId);
  const nextHost = session.participants.find((p) => p.id === toParticipantId);
  if (!nextHost) return;

  if (outgoingHost) outgoingHost.role = 'member';
  nextHost.role = 'host';
  session.hostId = nextHost.id;
}

/**
 * Promotes the longest-tenured currently-connected participant (other than
 * the outgoing host) to host, once the host-succession grace period has
 * expired with no reconnect (infrastructure.md Host Succession). A no-op
 * if the session is gone, the host already reconnected, or nobody else is
 * connected to promote.
 */
export function promoteNextHost(ctx: HandlerContext, code: string): void {
  const session = ctx.sessionStore.get(code);
  if (!session) return;

  const host = session.participants.find((p) => p.id === session.hostId);
  if (host?.connectionStatus === 'connected') return;

  const candidates = session.participants.filter((p) => p.connectionStatus === 'connected' && p.id !== session.hostId);
  if (candidates.length === 0) return;

  const nextHost = candidates.reduce((longest, p) => (p.joinedAt < longest.joinedAt ? p : longest));
  transferHost(session, nextHost.id);

  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
