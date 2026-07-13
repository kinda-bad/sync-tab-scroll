import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handlePlaybackTickReport } from './playback-tick-report.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('playback-tick-report', () => {
  it('rejects a non-host and leaves tickPosition unchanged', () => {
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

    handlePlaybackTickReport(ctx, memberSocket, { type: 'playback-tick-report', tickPosition: 500 });

    expect(session.playbackState.tickPosition).toBe(0);
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can report tick position' }]);
  });

  it('lets the host report tickPosition, updates serverTimestamp, and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    const before = Date.now();
    handlePlaybackTickReport(ctx, hostSocket, { type: 'playback-tick-report', tickPosition: 1234 });

    expect(session.playbackState.tickPosition).toBe(1234);
    expect(session.playbackState.serverTimestamp).toBeGreaterThanOrEqual(before);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'session-state', session: { playbackState: { tickPosition: 1234 } } });
  });
});
