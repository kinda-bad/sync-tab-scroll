import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleHostDelegate } from './host-delegate.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('host-delegate', () => {
  it('rejects a non-host sender and leaves hostId unchanged', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    );
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleHostDelegate(ctx, memberSocket, { type: 'host-delegate', targetParticipantId: 'host-1' });

    expect(session.hostId).toBe('host-1');
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can delegate host privileges' }]);
  });

  it('rejects targeting yourself', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleHostDelegate(ctx, hostSocket, { type: 'host-delegate', targetParticipantId: 'host-1' });

    expect(session.hostId).toBe('host-1');
    expect(sent).toEqual([{ type: 'error', message: 'You are already the host' }]);
  });

  it('rejects a disconnected or nonexistent target', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    );
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleHostDelegate(ctx, hostSocket, { type: 'host-delegate', targetParticipantId: 'member-1' });
    expect(session.hostId).toBe('host-1');

    handleHostDelegate(ctx, hostSocket, { type: 'host-delegate', targetParticipantId: 'nonexistent' });
    expect(session.hostId).toBe('host-1');

    expect(sent).toEqual([
      { type: 'error', message: 'Participant not found or not connected' },
      { type: 'error', message: 'Participant not found or not connected' },
    ]);
  });

  it('lets the host delegate to a connected participant and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    );
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('host-1'));

    handleHostDelegate(ctx, hostSocket, { type: 'host-delegate', targetParticipantId: 'member-1' });

    expect(session.hostId).toBe('member-1');
    expect(session.participants.find((p) => p.id === 'host-1')!.role).toBe('member');
    expect(session.participants.find((p) => p.id === 'member-1')!.role).toBe('host');
    expect(broadcasts).toHaveLength(1);
  });

  it('clears pendingHostRequest when delegating to the pending requester', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    );
    session.pendingHostRequest = 'member-1';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleHostDelegate(ctx, hostSocket, { type: 'host-delegate', targetParticipantId: 'member-1' });

    expect(session.pendingHostRequest).toBeNull();
  });

  it('leaves an existing pendingHostRequest untouched when delegating to someone else', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
      { id: 'member-2', displayName: 'Member 2', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 2 , userId: null},
    );
    session.pendingHostRequest = 'member-1';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleHostDelegate(ctx, hostSocket, { type: 'host-delegate', targetParticipantId: 'member-2' });

    expect(session.pendingHostRequest).toBe('member-1');
  });
});
