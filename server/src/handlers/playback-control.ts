import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';

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
    case 'start':
      session.playbackState.status = 'running';
      session.lobbyCursorTick = null; // datamodel.md: null once playback starts
      session.spotlightMode = false; // datamodel.md: resets to false once playback starts
      break;
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
