import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleReadinessUpdate } from './readiness-update.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

describe('readiness-update', () => {
  it('sets the requesting participant readiness and broadcasts session-state', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: { catalogues: [], songs: [] } };
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'loading', joinedAt: 0 });
    const socket = fakeSocket();
    ctx.connections.attach(socket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    handleReadinessUpdate(ctx, socket, { type: 'readiness-update', readiness: 'ready' });

    expect(session.participants[0].readiness).toBe('ready');
    expect(broadcasts).toHaveLength(1);
  });
});
