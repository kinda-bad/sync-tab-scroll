import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleSessionCreate } from './session-create.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

describe('session-create', () => {
  it('creates a session, attaches the socket as host, and sends session-state + catalog', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } };
    const socket = fakeSocket();
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => {
      sent.push(message);
    };

    handleSessionCreate(ctx, socket, { type: 'session-create', displayName: 'Alice' });

    const conn = ctx.connections.get(socket);
    expect(conn).toBeDefined();
    const session = ctx.sessionStore.get(conn!.sessionCode);
    expect(session).toBeDefined();
    expect(session!.hostId).toBe(conn!.participantId);
    expect(session!.participants).toHaveLength(1);
    expect(session!.participants[0]).toMatchObject({ displayName: 'Alice', role: 'host', connectionStatus: 'connected' });

    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ type: 'session-state', selfParticipantId: conn!.participantId });
    expect(sent[1]).toEqual({ type: 'catalog', catalogues: [], songs: [] });
  });

  it('T007: a signed-in creator\'s host Participant carries their userId on the wire', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } };
    const socket = fakeSocket();
    ctx.connections.stampUserId(socket, 'user-1');

    handleSessionCreate(ctx, socket, { type: 'session-create', displayName: 'Alice' });

    const conn = ctx.connections.get(socket)!;
    const session = ctx.sessionStore.get(conn.sessionCode)!;
    expect(session.participants[0].userId).toBe('user-1');
  });

  it('T007: an anonymous creator\'s host Participant carries a null userId on the wire', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } };
    const socket = fakeSocket();

    handleSessionCreate(ctx, socket, { type: 'session-create', displayName: 'Alice' });

    const conn = ctx.connections.get(socket)!;
    const session = ctx.sessionStore.get(conn.sessionCode)!;
    expect(session.participants[0].userId).toBeNull();
  });

  // T003: input-validation hardening (feedback-input-sanitization-hardening-7a9a
  // F001) — control characters and HTML special characters must be stripped
  // from displayName before it's stored/broadcast.
  it('T003: sanitizes displayName (strips control chars and HTML special chars)', () => {
    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } };
    const socket = fakeSocket();

    handleSessionCreate(ctx, socket, { type: 'session-create', displayName: '<script>Alice</script>\x00' });

    const conn = ctx.connections.get(socket)!;
    const session = ctx.sessionStore.get(conn.sessionCode)!;
    expect(session.participants[0].displayName).toBe('scriptAlice/script');
  });
});
