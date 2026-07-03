import { describe, expect, it } from 'vitest';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import type { HandlerContext } from './handlers/context.js';
import { promoteNextHost } from './host-succession.js';

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: [] } satisfies HandlerContext;
}

describe('promoteNextHost', () => {
  it('is a no-op if the session is gone', () => {
    const ctx = makeCtx();
    expect(() => promoteNextHost(ctx, 'NOPE')).not.toThrow();
  });

  it('is a no-op if the current host is still connected', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    let broadcastCalled = false;
    ctx.connections.broadcast = () => {
      broadcastCalled = true;
    };

    promoteNextHost(ctx, session.code);

    expect(session.hostId).toBe('host-1');
    expect(broadcastCalled).toBe(false);
  });

  it('is a no-op if there are no other connected participants', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    let broadcastCalled = false;
    ctx.connections.broadcast = () => {
      broadcastCalled = true;
    };

    promoteNextHost(ctx, session.code);

    expect(session.hostId).toBe('host-1');
    expect(broadcastCalled).toBe(false);
  });

  it('promotes the longest-tenured connected non-host participant and broadcasts', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'newer', displayName: 'Newer', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 100 },
      { id: 'oldest', displayName: 'Oldest', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 10 },
    );
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('oldest'));

    promoteNextHost(ctx, session.code);

    expect(session.hostId).toBe('oldest');
    const oldHost = session.participants.find((p) => p.id === 'host-1')!;
    const newHost = session.participants.find((p) => p.id === 'oldest')!;
    expect(oldHost.role).toBe('member');
    expect(newHost.role).toBe('host');
    expect(broadcasts).toHaveLength(1);
  });
});
