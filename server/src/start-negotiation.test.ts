import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import type { ReadinessStatus, ServerMessage } from '@sync-tab-scroll/shared';
import { NullAccountStore } from './accounts/null-store.js';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import type { HandlerContext } from './handlers/context.js';
import { handlePlaybackControl } from './handlers/playback-control.js';
import { handleStartConfirmationAnswer } from './handlers/start-confirmation-answer.js';
import { handleReadySet } from './handlers/ready-set.js';
import { handleDisconnect } from './disconnect.js';

// Start negotiation (T004, infrastructure.md Start Negotiation): a host
// `start` while any CONNECTED participant isn't `ready` is held behind a
// confirmation exchange; the happy path (everyone ready) starts exactly as
// today with no new messages. The host is exempt from the count — starting
// IS their confirmation (their readiness flips to `ready`).

function makeSocket(): { socket: WebSocket; received: ServerMessage[] } {
  const received: ServerMessage[] = [];
  const socket = { send: (data: string) => void received.push(JSON.parse(data) as ServerMessage) } as unknown as WebSocket;
  return { socket, received };
}

function types(received: ServerMessage[]): string[] {
  return received.map((m) => m.type);
}

function setup(participants: { id: string; role: 'host' | 'member'; readiness: ReadinessStatus; connected?: boolean }[]) {
  const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs: [] } };
  const session = ctx.sessionStore.create(participants.find((p) => p.role === 'host')!.id);
  const sockets = new Map<string, { socket: WebSocket; received: ServerMessage[] }>();
  for (const p of participants) {
    session.participants.push({ id: p.id, displayName: p.id, role: p.role, connectionStatus: p.connected === false ? 'disconnected' : 'connected', selectedPart: 0, readiness: p.readiness, joinedAt: 0, userId: null });
    if (p.connected !== false) {
      const entry = makeSocket();
      ctx.connections.attach(entry.socket, { sessionCode: session.code, participantId: p.id });
      sockets.set(p.id, entry);
    }
  }
  return { ctx, session, sockets };
}

describe('start negotiation', () => {
  it('happy path: everyone connected is ready — starts immediately, only session-state goes out', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'ready' },
    ]);

    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('running');
    expect(types(sockets.get('host-1')!.received)).toEqual(['session-state']);
    expect(types(sockets.get('member-1')!.received)).toEqual(['session-state']);
  });

  it('host exemption: a merely-loaded host starts anyway and is flipped to ready', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'loaded' },
      { id: 'member-1', role: 'member', readiness: 'ready' },
    ]);

    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('running');
    expect(session.participants.find((p) => p.id === 'host-1')!.readiness).toBe('ready');
    expect(types(sockets.get('host-1')!.received)).toEqual(['session-state']);
  });

  it('disconnected not-ready participants are not counted or messaged', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded', connected: false },
    ]);

    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('running');
    expect(types(sockets.get('host-1')!.received)).toEqual(['session-state']);
  });

  it('hold: a connected not-ready member blocks the start and opens the negotiation', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
      { id: 'member-2', role: 'member', readiness: 'no-part' },
      { id: 'member-3', role: 'member', readiness: 'ready' },
    ]);

    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('stopped');
    expect(sockets.get('host-1')!.received).toContainEqual({ type: 'start-confirmation-needed', notReadyCount: 2 });
    expect(types(sockets.get('member-1')!.received)).toContain('host-start-pending');
    expect(types(sockets.get('member-2')!.received)).toContain('host-start-pending');
    expect(types(sockets.get('member-3')!.received)).not.toContain('host-start-pending');
  });

  it('confirm: proceed=true runs the normal start flow and resolves started:true to pending participants', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
    ]);
    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    handleStartConfirmationAnswer(ctx, sockets.get('host-1')!.socket, { type: 'start-confirmation-answer', proceed: true });

    expect(session.playbackState.status).toBe('running');
    expect(sockets.get('member-1')!.received).toContainEqual({ type: 'host-start-resolved', started: true });
  });

  it('cancel: proceed=false starts nothing and resolves started:false', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
    ]);
    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    handleStartConfirmationAnswer(ctx, sockets.get('host-1')!.socket, { type: 'start-confirmation-answer', proceed: false });

    expect(session.playbackState.status).toBe('stopped');
    expect(sockets.get('member-1')!.received).toContainEqual({ type: 'host-start-resolved', started: false });
  });

  it('cancel then ready-set: answers given during the window persist (no rollback)', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
    ]);
    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });
    handleReadySet(ctx, sockets.get('member-1')!.socket, { type: 'ready-set', ready: true });

    handleStartConfirmationAnswer(ctx, sockets.get('host-1')!.socket, { type: 'start-confirmation-answer', proceed: false });

    expect(session.participants.find((p) => p.id === 'member-1')!.readiness).toBe('ready');
  });

  it('replace: a second start while pending recounts and re-messages', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
      { id: 'member-2', role: 'member', readiness: 'loaded' },
    ]);
    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });
    // member-2 readies during the window — the recount must drop to 1.
    handleReadySet(ctx, sockets.get('member-2')!.socket, { type: 'ready-set', ready: true });

    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('stopped');
    expect(sockets.get('host-1')!.received).toContainEqual({ type: 'start-confirmation-needed', notReadyCount: 2 });
    expect(sockets.get('host-1')!.received).toContainEqual({ type: 'start-confirmation-needed', notReadyCount: 1 });
    expect(types(sockets.get('member-1')!.received).filter((t) => t === 'host-start-pending')).toHaveLength(2);
  });

  it('a second start after everyone readied starts and resolves the stale negotiation started:true', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
    ]);
    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });
    handleReadySet(ctx, sockets.get('member-1')!.socket, { type: 'ready-set', ready: true });

    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    expect(session.playbackState.status).toBe('running');
    expect(sockets.get('member-1')!.received).toContainEqual({ type: 'host-start-resolved', started: true });
  });

  it('host disconnect while pending cancels the negotiation (resolved started:false)', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
    ]);
    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    ctx.connections.detach(sockets.get('host-1')!.socket);
    handleDisconnect(ctx, session.code, 'host-1');

    expect(session.playbackState.status).toBe('stopped');
    expect(sockets.get('member-1')!.received).toContainEqual({ type: 'host-start-resolved', started: false });
  });

  it('rejects an answer from a non-host with a terse error', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'loaded' },
    ]);
    handlePlaybackControl(ctx, sockets.get('host-1')!.socket, { type: 'playback-control', action: 'start' });

    handleStartConfirmationAnswer(ctx, sockets.get('member-1')!.socket, { type: 'start-confirmation-answer', proceed: true });

    expect(session.playbackState.status).toBe('stopped');
    expect(types(sockets.get('member-1')!.received)).toContain('error');
  });

  it('rejects an answer when no negotiation is pending', () => {
    const { ctx, session, sockets } = setup([
      { id: 'host-1', role: 'host', readiness: 'ready' },
      { id: 'member-1', role: 'member', readiness: 'ready' },
    ]);

    handleStartConfirmationAnswer(ctx, sockets.get('host-1')!.socket, { type: 'start-confirmation-answer', proceed: true });

    expect(session.playbackState.status).toBe('stopped');
    expect(types(sockets.get('host-1')!.received)).toContain('error');
  });
});
