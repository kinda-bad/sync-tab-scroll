import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleRequestHost } from './request-host.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('request-host', () => {
  it('sets pendingHostRequest to the sender and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    );
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('member-1'));

    handleRequestHost(ctx, memberSocket, { type: 'request-host' });

    expect(session.pendingHostRequest).toBe('member-1');
    expect(broadcasts).toHaveLength(1);
  });

  it('rejects a sender who is already host', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleRequestHost(ctx, hostSocket, { type: 'request-host' });

    expect(session.pendingHostRequest).toBeNull();
    expect(sent).toEqual([{ type: 'error', message: 'You are already the host' }]);
  });

  it('rejects when a different request is already pending', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
      { id: 'member-2', displayName: 'Member 2', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 2 },
    );
    session.pendingHostRequest = 'member-1';
    const member2Socket = fakeSocket();
    ctx.connections.attach(member2Socket, { sessionCode: session.code, participantId: 'member-2' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleRequestHost(ctx, member2Socket, { type: 'request-host' });

    expect(session.pendingHostRequest).toBe('member-1');
    expect(sent).toEqual([{ type: 'error', message: 'A host request is already pending' }]);
  });

  it('rejects the same requester re-sending while their own request is still pending', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    );
    session.pendingHostRequest = 'member-1';
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleRequestHost(ctx, memberSocket, { type: 'request-host' });

    expect(session.pendingHostRequest).toBe('member-1');
    expect(sent).toEqual([{ type: 'error', message: 'A host request is already pending' }]);
  });
});
