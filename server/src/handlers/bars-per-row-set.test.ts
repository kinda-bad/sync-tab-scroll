import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleBarsPerRowSet } from './bars-per-row-set.js';

// T012 (host-mandated-bars-per-row-layout): a new host-only `bars-per-row-set`
// message updates Session.hostBarsPerRow and broadcasts session-state, and is
// rejected for a non-host sender — same pattern as spotlight-mode-set.ts.

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('bars-per-row-set', () => {
  it('rejects a non-host and leaves hostBarsPerRow unchanged', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    const sent: ServerMessage[] = [];
    ctx.connections.send = (_socket, message) => {
      sent.push(message);
    };

    handleBarsPerRowSet(ctx, memberSocket, { type: 'bars-per-row-set', barsPerRow: 4 });

    expect(session.hostBarsPerRow).toBeNull();
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can set the bars-per-row layout' }]);
  });

  it('lets the host set hostBarsPerRow and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    handleBarsPerRowSet(ctx, hostSocket, { type: 'bars-per-row-set', barsPerRow: 4 });

    expect(session.hostBarsPerRow).toBe(4);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'session-state', session: { hostBarsPerRow: 4 } });
  });

  it('lets the host clear the pin back to null (Auto)', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.hostBarsPerRow = 4;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleBarsPerRowSet(ctx, hostSocket, { type: 'bars-per-row-set', barsPerRow: null });

    expect(session.hostBarsPerRow).toBeNull();
  });
});
