import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { transferHost } from '../host-succession.js';
import { rederiveHostMembershipUnlocks } from '../membership-unlock.js';

export function handleHostDelegate(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'host-delegate' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can delegate host privileges' });
    return;
  }

  if (message.targetParticipantId === conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'You are already the host' });
    return;
  }

  const target = session.participants.find((p) => p.id === message.targetParticipantId);
  if (!target || target.connectionStatus !== 'connected') {
    ctx.connections.send(socket, { type: 'error', message: 'Participant not found or not connected' });
    return;
  }

  transferHost(session, target.id);
  if (session.pendingHostRequest === target.id) session.pendingHostRequest = null;

  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));

  // Host changed → re-derive the membership-unlock slice from the new host's
  // memberships (§13 S4); key-typed unlocks persist. No-op with no DB.
  void rederiveHostMembershipUnlocks(ctx, session.code);
}
