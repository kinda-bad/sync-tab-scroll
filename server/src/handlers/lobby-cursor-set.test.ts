import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleLobbyCursorSet } from './lobby-cursor-set.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('lobby-cursor-set', () => {
  it('rejects a non-host and leaves lobbyCursorTick unchanged', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleLobbyCursorSet(ctx, memberSocket, { type: 'lobby-cursor-set', tickPosition: 500 });

    expect(session.lobbyCursorTick).toBeNull();
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can set the lobby cursor' }]);
  });

  it('lets the host set a tickPosition and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage('host-1'));

    handleLobbyCursorSet(ctx, hostSocket, { type: 'lobby-cursor-set', tickPosition: 1234 });

    expect(session.lobbyCursorTick).toBe(1234);
    expect(broadcasts).toHaveLength(1);
  });

  it('lets the host clear the lobby cursor with null', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.lobbyCursorTick = 999;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleLobbyCursorSet(ctx, hostSocket, { type: 'lobby-cursor-set', tickPosition: null });

    expect(session.lobbyCursorTick).toBeNull();
  });
});
