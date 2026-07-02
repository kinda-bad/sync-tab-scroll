import type { HandlerContext } from './handlers/context.js';

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
  if (host) host.role = 'member';
  nextHost.role = 'host';
  session.hostId = nextHost.id;

  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
