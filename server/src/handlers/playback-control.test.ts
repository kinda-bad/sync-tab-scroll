import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handlePlaybackControl } from './playback-control.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx() {
  const ctx = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog: [] } satisfies HandlerContext;
  ctx.connections.broadcast = () => {};
  return ctx;
}

function attachHost(ctx: HandlerContext, session: ReturnType<SessionStore['create']>) {
  const socket = fakeSocket();
  ctx.connections.attach(socket, { sessionCode: session.code, participantId: session.hostId });
  return socket;
}

describe('playback-control', () => {
  it('rejects a non-host', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handlePlaybackControl(ctx, memberSocket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('stopped');
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can control playback' }]);
  });

  it('start sets status running and resets lobbyCursorTick/spotlightMode', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.lobbyCursorTick = 42;
    session.spotlightMode = true;
    const hostSocket = attachHost(ctx, session);

    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('running');
    expect(session.lobbyCursorTick).toBeNull();
    expect(session.spotlightMode).toBe(false);
  });

  it('resume sets status running without touching lobbyCursorTick/spotlightMode', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.status = 'paused';
    session.lobbyCursorTick = 42;
    session.spotlightMode = true;
    const hostSocket = attachHost(ctx, session);

    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'resume' });

    expect(session.playbackState.status).toBe('running');
    expect(session.lobbyCursorTick).toBe(42);
    expect(session.spotlightMode).toBe(true);
  });

  it('pause sets status paused', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.status = 'running';
    const hostSocket = attachHost(ctx, session);

    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'pause' });

    expect(session.playbackState.status).toBe('paused');
  });

  it('stop sets status stopped and resets tickPosition to 0', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.status = 'running';
    session.playbackState.tickPosition = 5000;
    const hostSocket = attachHost(ctx, session);

    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'stop' });

    expect(session.playbackState.status).toBe('stopped');
    expect(session.playbackState.tickPosition).toBe(0);
  });

  it('seek updates tickPosition when provided', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = attachHost(ctx, session);

    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'seek', tickPosition: 8080 });

    expect(session.playbackState.tickPosition).toBe(8080);
  });

  it('seek leaves tickPosition unchanged when tickPosition is undefined', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.tickPosition = 100;
    const hostSocket = attachHost(ctx, session);

    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'seek' });

    expect(session.playbackState.tickPosition).toBe(100);
  });

  it('every action updates serverTimestamp and broadcasts session-state', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.playbackState.serverTimestamp = 0;
    const hostSocket = attachHost(ctx, session);
    const broadcasts: unknown[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => broadcasts.push(buildMessage(session.hostId));

    handlePlaybackControl(ctx, hostSocket, { type: 'playback-control', action: 'pause' });

    expect(session.playbackState.serverTimestamp).toBeGreaterThan(0);
    expect(broadcasts).toHaveLength(1);
  });
});
