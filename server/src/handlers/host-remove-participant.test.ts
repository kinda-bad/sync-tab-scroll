import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleHostRemoveParticipant } from './host-remove-participant.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('host-remove-participant', () => {
  it('rejects a non-host and leaves participants unchanged', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    );
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleHostRemoveParticipant(ctx, memberSocket, { type: 'host-remove-participant', participantId: 'host-1' });

    expect(session.participants).toHaveLength(2);
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can remove participants' }]);
  });

  it('lets the host remove a participant and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    );
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('host-1'));

    handleHostRemoveParticipant(ctx, hostSocket, { type: 'host-remove-participant', participantId: 'member-1' });

    expect(session.participants).toHaveLength(1);
    expect(session.participants[0].id).toBe('host-1');
    expect(broadcasts).toHaveLength(1);
  });
});
