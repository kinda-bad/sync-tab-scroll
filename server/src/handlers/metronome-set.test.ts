import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleMetronomeSet } from './metronome-set.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: [] } satisfies HandlerContext;
}

describe('metronome-set', () => {
  it('rejects a non-host and leaves metronomeEnabled unchanged', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    const memberSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    const sent: ServerMessage[] = [];
    ctx.connections.send = (socket, message) => {
      sent.push(message);
    };

    handleMetronomeSet(ctx, memberSocket, { type: 'metronome-set', enabled: true });

    expect(session.metronomeEnabled).toBe(false);
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can control the metronome' }]);
  });

  it('lets the host toggle metronomeEnabled and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    handleMetronomeSet(ctx, hostSocket, { type: 'metronome-set', enabled: true });

    expect(session.metronomeEnabled).toBe(true);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'session-state', session: { metronomeEnabled: true } });
  });
});
