import type { HandlerContext } from './handlers/context.js';
import { promoteNextHost } from './host-succession.js';
import { resolvePendingStart } from './handlers/playback-control.js';

/**
 * Handles a socket disconnect for a given session/participant: marks the
 * participant disconnected, clears a pending host request if it was theirs
 * (infrastructure.md Host Transfer — an unreachable participant shouldn't
 * remain a live pending request), broadcasts the resulting session-state,
 * and starts the host-succession grace timer if the outgoing host was the
 * one who disconnected. A no-op if the session is already gone.
 */
export function handleDisconnect(ctx: HandlerContext, sessionCode: string, participantId: string): void {
  const session = ctx.sessionStore.get(sessionCode);
  if (!session) return;

  const participant = session.participants.find((p) => p.id === participantId);
  if (participant) participant.connectionStatus = 'disconnected';

  if (session.pendingHostRequest === participantId) session.pendingHostRequest = null;

  // Start negotiation (infrastructure.md): the host disconnecting while a
  // negotiation is pending cancels it — resolved `started: false` so the
  // pending participants' modals dismiss instead of hanging forever.
  if (participantId === session.hostId) resolvePendingStart(ctx, session, false);

  // Pause-on-empty: if this disconnect leaves nobody connected while playback
  // is running, freeze it as 'paused' so a much-later rejoin (the empty-TTL
  // window is hours) doesn't drift-correct against a stale serverTimestamp.
  const anyConnected = session.participants.some((p) => p.connectionStatus === 'connected');
  if (!anyConnected && session.playbackState.status === 'running') {
    session.playbackState = { ...session.playbackState, status: 'paused', serverTimestamp: Date.now() };
  }

  ctx.sessionStore.markPossiblyEmpty(sessionCode);
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));

  if (participantId === session.hostId) {
    ctx.sessionStore.scheduleHostReassignment(sessionCode, () => promoteNextHost(ctx, sessionCode));
  }
}
