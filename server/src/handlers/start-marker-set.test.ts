import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleStartMarkerSet } from './start-marker-set.js';

// per-song-default-start-point: the host-only `start-marker-set` message sets
// or clears Session.startMarkerBar — same host-only set/clear pattern as
// early-stop-set.ts.

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function hostCtx() {
  const ctx = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
  const session = ctx.sessionStore.create('host-1');
  const hostSocket = fakeSocket();
  ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
  const sent: ServerMessage[] = [];
  ctx.connections.send = (_socket, message) => {
    sent.push(message);
  };
  const broadcasts: ServerMessage[] = [];
  ctx.connections.broadcast = (_code, buildMessage) => {
    broadcasts.push(buildMessage('host-1'));
  };
  return { ctx, session, hostSocket, sent, broadcasts };
}

describe('start-marker-set', () => {
  it('defaults to no start marker on a new session', () => {
    const { session } = hostCtx();
    expect(session.startMarkerBar).toBeNull();
  });

  it('rejects a non-host and leaves the marker unchanged', () => {
    const { ctx, session, sent, broadcasts } = hostCtx();
    session.startMarkerBar = 9;
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    handleStartMarkerSet(ctx, memberSocket, { type: 'start-marker-set', bar: null });

    expect(session.startMarkerBar).toBe(9);
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can set the start marker' }]);
    expect(broadcasts).toHaveLength(0);
  });

  it('lets the host set the marker and broadcasts session-state', () => {
    const { ctx, session, hostSocket, broadcasts } = hostCtx();

    handleStartMarkerSet(ctx, hostSocket, { type: 'start-marker-set', bar: 5 });

    expect(session.startMarkerBar).toBe(5);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'session-state', session: { startMarkerBar: 5 } });
  });

  it.each([0, -1, 2.5, Number.NaN])('rejects an invalid bar (%s) with an error, leaving the marker unchanged', (bar) => {
    const { ctx, session, hostSocket, sent, broadcasts } = hostCtx();
    session.startMarkerBar = 9;

    handleStartMarkerSet(ctx, hostSocket, { type: 'start-marker-set', bar });

    expect(session.startMarkerBar).toBe(9);
    expect(sent).toEqual([{ type: 'error', message: 'Start marker must be a bar number (1 or more)' }]);
    expect(broadcasts).toHaveLength(0);
  });

  it('clearing while stopped also sends everyone back to bar 1', () => {
    const { ctx, session, hostSocket } = hostCtx();
    session.startMarkerBar = 9;
    session.playbackState.tickPosition = 30240;

    handleStartMarkerSet(ctx, hostSocket, { type: 'start-marker-set', bar: null });

    expect(session.startMarkerBar).toBeNull();
    expect(session.playbackState.tickPosition).toBe(0);
  });

  it('clearing while paused leaves the paused position alone', () => {
    const { ctx, session, hostSocket } = hostCtx();
    session.startMarkerBar = 9;
    session.playbackState.status = 'paused';
    session.playbackState.tickPosition = 50000;

    handleStartMarkerSet(ctx, hostSocket, { type: 'start-marker-set', bar: null });

    expect(session.startMarkerBar).toBeNull();
    expect(session.playbackState.tickPosition).toBe(50000);
  });
});
