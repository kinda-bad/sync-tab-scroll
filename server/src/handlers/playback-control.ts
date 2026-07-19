import type { WebSocket } from 'ws';
import type { ClientMessage, Session } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

/**
 * The normal start flow, shared verbatim between the happy path and the
 * host's "start anyway" confirmation (start-confirmation-answer) so both
 * produce an identical start (Principle I). Mutates state only — the
 * caller broadcasts.
 */
export function runStartFlow(session: Session): void {
  session.playbackState.status = 'running';
  session.lobbyCursorTick = null; // datamodel.md: null once playback starts
  session.spotlightMode = false; // datamodel.md: resets to false once playback starts
}

/**
 * Resolves an open start negotiation (infrastructure.md Start Negotiation):
 * sends `host-start-resolved { started }` to each participant that was
 * counted and messaged, and clears the pending record. A no-op if nothing
 * is pending.
 */
export function resolvePendingStart(ctx: HandlerContext, session: Session, started: boolean): void {
  const pending = ctx.sessionStore.getPendingStart(session.code);
  if (!pending) return;
  ctx.sessionStore.clearPendingStart(session.code);
  for (const participantId of pending) {
    ctx.connections.sendToParticipant(session.code, participantId, { type: 'host-start-resolved', started });
  }
}

export function handlePlaybackControl(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'playback-control' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can control playback' });
    return;
  }

  switch (message.action) {
    case 'start': {
      // Start negotiation (infrastructure.md Start Negotiation): the host
      // is exempt from the count — starting IS their confirmation, so a
      // merely-`loaded` host is flipped to `ready` here. Only CONNECTED
      // not-ready participants count; a disconnected one can't answer and
      // never blocks the start.
      const host = session.participants.find((p) => p.id === conn.participantId);
      if (host && host.readiness === 'loaded') host.readiness = 'ready';
      const notReady = session.participants.filter((p) => p.id !== session.hostId && p.connectionStatus === 'connected' && p.readiness !== 'ready');
      if (notReady.length > 0) {
        // Hold the start and open (or replace — recount + re-message) the
        // one pending negotiation for this session.
        ctx.sessionStore.setPendingStart(session.code, notReady.map((p) => p.id));
        ctx.connections.send(socket, { type: 'start-confirmation-needed', notReadyCount: notReady.length });
        for (const p of notReady) {
          ctx.connections.sendToParticipant(session.code, p.id, { type: 'host-start-pending' });
        }
        // Broadcast so the host's `loaded → ready` flip (above) is visible;
        // playback state itself is untouched while the start is held.
        ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
        return;
      }
      // Everyone connected is ready: a stale negotiation (participants
      // readied during the window, host pressed Start again instead of
      // answering) resolves started:true so their modals dismiss.
      resolvePendingStart(ctx, session, true);
      runStartFlow(session);
      break;
    }
    case 'resume':
      session.playbackState.status = 'running';
      break;
    case 'pause':
      session.playbackState.status = 'paused';
      break;
    case 'stop':
      // Full stop, not pause-in-place: resets position and sends everyone
      // back to the Lobby (client view transition keys off this status,
      // ws-client.ts) rather than leaving them parked mid-song.
      session.playbackState.status = 'stopped';
      session.playbackState.tickPosition = 0;
      break;
    case 'seek':
      if (message.tickPosition !== undefined) session.playbackState.tickPosition = message.tickPosition;
      break;
  }
  session.playbackState.serverTimestamp = Date.now();

  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
}
