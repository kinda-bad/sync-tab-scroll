import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleSessionCreate } from './session-create.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

describe('session-create', () => {
  it('creates a session, attaches the socket as host, and sends session-state + catalog', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: { catalogues: [], songs: [] } };
    const socket = fakeSocket();
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => {
      sent.push(message);
    };

    handleSessionCreate(ctx, socket, { type: 'session-create', displayName: 'Alice' });

    const conn = ctx.connections.get(socket);
    expect(conn).toBeDefined();
    const session = ctx.sessionStore.get(conn!.sessionCode);
    expect(session).toBeDefined();
    expect(session!.hostId).toBe(conn!.participantId);
    expect(session!.participants).toHaveLength(1);
    expect(session!.participants[0]).toMatchObject({ displayName: 'Alice', role: 'host', connectionStatus: 'connected' });

    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ type: 'session-state', selfParticipantId: conn!.participantId });
    expect(sent[1]).toEqual({ type: 'catalog', songs: [] });
  });
});
