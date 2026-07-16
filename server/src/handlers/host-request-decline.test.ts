import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleHostRequestDecline } from './host-request-decline.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('host-request-decline', () => {
  it('clears pendingHostRequest with no hostId change and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    );
    session.pendingHostRequest = 'member-1';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('host-1'));

    handleHostRequestDecline(ctx, hostSocket, { type: 'host-request-decline' });

    expect(session.pendingHostRequest).toBeNull();
    expect(session.hostId).toBe('host-1');
    expect(session.participants.find((p) => p.id === 'member-1')!.role).toBe('member');
    expect(broadcasts).toHaveLength(1);
  });

  it('rejects a non-host sender', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    );
    session.pendingHostRequest = 'member-1';
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleHostRequestDecline(ctx, memberSocket, { type: 'host-request-decline' });

    expect(session.pendingHostRequest).toBe('member-1');
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can decline a host request' }]);
  });

  it('rejects declining when nothing is pending', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleHostRequestDecline(ctx, hostSocket, { type: 'host-request-decline' });

    expect(sent).toEqual([{ type: 'error', message: 'No host request is pending' }]);
  });
});
