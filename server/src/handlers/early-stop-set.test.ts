import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleEarlyStopSet } from './early-stop-set.js';

// T017 (host-set-early-stop-point-for): a new host-only `early-stop-set`
// message updates Session.earlyStopTick and broadcasts session-state, and is
// rejected for a non-host sender — same pattern as spotlight-mode-set.ts.

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('early-stop-set', () => {
  it('rejects a non-host and leaves earlyStopTick unchanged', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    const sent: ServerMessage[] = [];
    ctx.connections.send = (_socket, message) => {
      sent.push(message);
    };

    handleEarlyStopSet(ctx, memberSocket, { type: 'early-stop-set', tickPosition: 1000 });

    expect(session.earlyStopTick).toBeNull();
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can set the early-stop point' }]);
  });

  it('lets the host set earlyStopTick and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    handleEarlyStopSet(ctx, hostSocket, { type: 'early-stop-set', tickPosition: 1000 });

    expect(session.earlyStopTick).toBe(1000);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'session-state', session: { earlyStopTick: 1000 } });
  });

  it('lets the host clear the early-stop point back to null', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.earlyStopTick = 1000;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleEarlyStopSet(ctx, hostSocket, { type: 'early-stop-set', tickPosition: null });

    expect(session.earlyStopTick).toBeNull();
  });
});
