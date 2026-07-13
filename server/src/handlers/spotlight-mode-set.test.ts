import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleSpotlightModeSet } from './spotlight-mode-set.js';
import { handlePlaybackControl } from './playback-control.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } } satisfies HandlerContext;
}

describe('spotlight-mode-set', () => {
  it('rejects a non-host and leaves spotlightMode unchanged', () => {
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

    handleSpotlightModeSet(ctx, memberSocket, { type: 'spotlight-mode-set', enabled: true });

    expect(session.spotlightMode).toBe(false);
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can set Spotlight mode' }]);
  });

  it('lets the host toggle spotlightMode and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => {
      broadcasts.push(buildMessage('host-1'));
    };

    handleSpotlightModeSet(ctx, hostSocket, { type: 'spotlight-mode-set', enabled: true });

    expect(session.spotlightMode).toBe(true);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'session-state', session: { spotlightMode: true } });
  });

  it('resets spotlightMode to false when playback starts', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    session.spotlightMode = true;
    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'start' });

    expect(session.spotlightMode).toBe(false);
  });
});
