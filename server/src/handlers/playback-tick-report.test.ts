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

  // T018 (host-set-early-stop-point-for): once the host-reported tickPosition
  // passes Session.earlyStopTick, the server auto-triggers the existing
  // host-Stop transition (playbackState.status flip), reusing the same
  // effect as playback-control.ts's 'stop' action.
  it('T018: auto-stops (status -> stopped, tickPosition reset to 0) once tickPosition passes earlyStopTick', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.status = 'running';
    session.earlyStopTick = 1000;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handlePlaybackTickReport(ctx, hostSocket, { type: 'playback-tick-report', tickPosition: 1050 });

    expect(session.playbackState.status).toBe('stopped');
    expect(session.playbackState.tickPosition).toBe(0);
  });

  it('T018: does not auto-stop while tickPosition is still before earlyStopTick', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.status = 'running';
    session.earlyStopTick = 1000;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handlePlaybackTickReport(ctx, hostSocket, { type: 'playback-tick-report', tickPosition: 500 });

    expect(session.playbackState.status).toBe('running');
    expect(session.playbackState.tickPosition).toBe(500);
  });

  it('T018: is a no-op when earlyStopTick is null', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.status = 'running';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handlePlaybackTickReport(ctx, hostSocket, { type: 'playback-tick-report', tickPosition: 999999 });

    expect(session.playbackState.status).toBe('running');
  });
});
