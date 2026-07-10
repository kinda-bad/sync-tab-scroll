import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handlePartSelect } from './part-select.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

describe('part-select', () => {
  it('sets the requesting participant selectedPart and broadcasts session-state', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: { catalogues: [], songs: [] } };
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    const socket = fakeSocket();
    ctx.connections.attach(socket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    handlePartSelect(ctx, socket, { type: 'part-select', part: 3 });

    expect(session.participants[0].selectedPart).toBe(3);
    expect(broadcasts).toHaveLength(1);
  });

  it('is a no-op if the socket is not attached to any connection', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: { catalogues: [], songs: [] } };
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('x'));

    expect(() => handlePartSelect(ctx, fakeSocket(), { type: 'part-select', part: 'lyrics' })).not.toThrow();
    expect(broadcasts).toHaveLength(0);
  });
});
