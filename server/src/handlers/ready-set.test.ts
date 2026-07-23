import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { ReadinessStatus, ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleReadySet } from './ready-set.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function makeCtx(): HandlerContext {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } };
}

function setup(readiness: ReadinessStatus) {
  const ctx = makeCtx();
  const session = ctx.sessionStore.create('host-1');
  session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness, joinedAt: 0, userId: null });
  const socket = fakeSocket();
  ctx.connections.attach(socket, { sessionCode: session.code, participantId: 'host-1' });
  const broadcasts: ServerMessage[] = [];
  ctx.connections.broadcast = (_code, buildMessage) => {
    broadcasts.push(buildMessage('host-1'));
  };
  const errors: ServerMessage[] = [];
  ctx.connections.send = (_socket, message) => {
    errors.push(message);
  };
  return { ctx, session, socket, broadcasts, errors };
}

describe('ready-set', () => {
  it('confirms loaded -> ready and broadcasts session-state', () => {
    const { ctx, session, socket, broadcasts } = setup('loaded');

    handleReadySet(ctx, socket, { type: 'ready-set', ready: true });

    expect(session.participants[0].readiness).toBe('ready');
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'session-state' });
  });

  it('un-readies ready -> loaded and broadcasts session-state', () => {
    const { ctx, session, socket, broadcasts } = setup('ready');

    handleReadySet(ctx, socket, { type: 'ready-set', ready: false });

    expect(session.participants[0].readiness).toBe('loaded');
    expect(broadcasts).toHaveLength(1);
  });

  it('is idempotent: ready:true while already ready stays ready', () => {
    const { ctx, session, socket } = setup('ready');

    handleReadySet(ctx, socket, { type: 'ready-set', ready: true });

    expect(session.participants[0].readiness).toBe('ready');
  });

  it('is idempotent: ready:false while loaded stays loaded', () => {
    const { ctx, session, socket } = setup('loaded');

    handleReadySet(ctx, socket, { type: 'ready-set', ready: false });

    expect(session.participants[0].readiness).toBe('loaded');
  });

  it.each(['no-part', 'loading'] as const)('rejects with a terse error while %s (not ready-able)', (state) => {
    const { ctx, session, socket, broadcasts, errors } = setup(state);

    handleReadySet(ctx, socket, { type: 'ready-set', ready: true });

    expect(session.participants[0].readiness).toBe(state);
    expect(broadcasts).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ type: 'error' });
  });

  it('ignores a socket with no attached connection', () => {
    const { ctx, broadcasts } = setup('loaded');

    handleReadySet(ctx, fakeSocket(), { type: 'ready-set', ready: true });

    expect(broadcasts).toHaveLength(0);
  });

  it('auto-resolves a pending start when the last not-ready participant readies up', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null });
    session.participants.push({ id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'loaded', joinedAt: 0, userId: null });
    ctx.sessionStore.setPendingStart(session.code, ['member-1']);

    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    ctx.connections.broadcast = () => {};
    const sentToParticipant: Array<{ participantId: string; message: ServerMessage }> = [];
    ctx.connections.sendToParticipant = (_code, participantId, message) => {
      sentToParticipant.push({ participantId, message });
    };

    handleReadySet(ctx, memberSocket, { type: 'ready-set', ready: true });

    expect(session.participants.find((p) => p.id === 'member-1')?.readiness).toBe('ready');
    expect(sentToParticipant).toContainEqual({ participantId: 'member-1', message: { type: 'host-start-resolved', started: true } });
    expect(session.playbackState.status).toBe('running');
    expect(session.lobbyCursorTick).toBeNull();
    expect(session.spotlightMode).toBe(false);
    expect(ctx.sessionStore.getPendingStart(session.code)).toBeUndefined();
  });

  it('does not auto-resolve a pending start while other pending participants remain not-ready', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null });
    session.participants.push({ id: 'member-1', displayName: 'Member 1', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'loaded', joinedAt: 0, userId: null });
    session.participants.push({ id: 'member-2', displayName: 'Member 2', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'loaded', joinedAt: 0, userId: null });
    ctx.sessionStore.setPendingStart(session.code, ['member-1', 'member-2']);

    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    ctx.connections.broadcast = () => {};
    const sentToParticipant: Array<{ participantId: string; message: ServerMessage }> = [];
    ctx.connections.sendToParticipant = (_code, participantId, message) => {
      sentToParticipant.push({ participantId, message });
    };

    handleReadySet(ctx, memberSocket, { type: 'ready-set', ready: true });

    expect(session.participants.find((p) => p.id === 'member-1')?.readiness).toBe('ready');
    expect(sentToParticipant).toHaveLength(0);
    expect(session.playbackState.status).not.toBe('running');
    expect(ctx.sessionStore.getPendingStart(session.code)).toEqual(['member-1', 'member-2']);
  });
});
