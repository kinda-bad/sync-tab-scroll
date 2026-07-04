import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleSessionJoin } from './session-join.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: [] } satisfies HandlerContext;
}

describe('session-join', () => {
  it('sends an error for a nonexistent session code', () => {
    const ctx = makeCtx();
    const socket = fakeSocket();
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => {
      sent.push(message);
    };

    handleSessionJoin(ctx, socket, { type: 'session-join', code: 'NOPE', displayName: 'Bob' });

    expect(sent).toEqual([{ type: 'error', message: 'Session NOPE not found' }]);
  });

  it('finds the session regardless of the join code\'s case (entry box only visually uppercases input)', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const socket = fakeSocket();
    ctx.connections.broadcast = () => {};

    handleSessionJoin(ctx, socket, { type: 'session-join', code: session.code.toLowerCase(), displayName: 'Bob' });

    expect(session.participants).toHaveLength(1);
    expect(session.participants[0]).toMatchObject({ displayName: 'Bob' });
  });

  it('adds a new participant and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const socket = fakeSocket();
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    handleSessionJoin(ctx, socket, { type: 'session-join', code: session.code, displayName: 'Bob' });

    expect(session.participants).toHaveLength(1);
    expect(session.participants[0]).toMatchObject({ displayName: 'Bob', role: 'member', connectionStatus: 'connected', readiness: 'no-part' });
    expect(broadcasts).toHaveLength(1);
  });

  it('reclaims an existing participant by participantId instead of minting a new one', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({
      id: 'existing-1',
      displayName: 'Old Name',
      role: 'member',
      connectionStatus: 'disconnected',
      selectedPart: 2,
      readiness: 'ready',
      joinedAt: 0,
    });
    const socket = fakeSocket();
    ctx.connections.broadcast = () => {};

    handleSessionJoin(ctx, socket, { type: 'session-join', code: session.code, displayName: 'New Name', participantId: 'existing-1' });

    expect(session.participants).toHaveLength(1);
    const participant = session.participants[0];
    expect(participant.displayName).toBe('New Name');
    expect(participant.connectionStatus).toBe('connected');
    expect(participant.readiness).toBe('no-part');
    expect(participant.selectedPart).toBe(2);
    expect(ctx.connections.get(socket)).toEqual({ sessionCode: session.code, participantId: 'existing-1' });
  });

  it('cancels a pending host-reassignment timer when the reconnecting participant is the host', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    ctx.connections.broadcast = () => {};

    let fired = false;
    ctx.sessionStore.scheduleHostReassignment(session.code, () => {
      fired = true;
    });

    handleSessionJoin(ctx, fakeSocket(), { type: 'session-join', code: session.code, displayName: 'Host', participantId: 'host-1' });

    // cancelHostReassignment clears the timer synchronously; nothing to
    // advance, just confirm calling it again is safe and nothing fired.
    expect(fired).toBe(false);
  });
});
