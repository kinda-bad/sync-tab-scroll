import { describe, expect, it } from 'vitest';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import type { HandlerContext } from './handlers/context.js';
import { handleDisconnect } from './disconnect.js';

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('handleDisconnect', () => {
  it('marks the participant disconnected and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('host-1'));

    handleDisconnect(ctx, session.code, 'host-1');

    expect(session.participants[0].connectionStatus).toBe('disconnected');
    expect(broadcasts).toHaveLength(1);
  });

  it('clears pendingHostRequest when the disconnecting participant is the pending requester', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    );
    session.pendingHostRequest = 'member-1';
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('host-1'));

    handleDisconnect(ctx, session.code, 'member-1');

    expect(session.pendingHostRequest).toBeNull();
    expect(broadcasts).toHaveLength(1);
  });

  it('leaves pendingHostRequest untouched when a different participant disconnects', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
      { id: 'member-2', displayName: 'Member 2', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 2 },
    );
    session.pendingHostRequest = 'member-1';
    ctx.connections.broadcast = () => {};

    handleDisconnect(ctx, session.code, 'member-2');

    expect(session.pendingHostRequest).toBe('member-1');
  });

  it('is a no-op if the session is already gone', () => {
    const ctx = makeCtx();
    expect(() => handleDisconnect(ctx, 'NOPE', 'anyone')).not.toThrow();
  });
});
