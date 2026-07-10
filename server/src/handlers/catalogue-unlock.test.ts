import { describe, expect, it } from 'vitest';
import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { CatalogSong, ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import type { LoadedCatalog } from '../catalog-loader.js';
import { handleCatalogueUnlock } from './catalogue-unlock.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function fakeSong(id: string, catalogueId: string): CatalogSong {
  return {
    id,
    catalogueId,
    name: id,
    artist: 'Artist',
    gpFilePath: `/catalog/${id}/song.gp`,
    parts: [],
    lyricsLrc: null,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
  };
}

const KEY = 's3cr3t';
const SALT = crypto.randomBytes(16).toString('hex');
const HASH = crypto.scryptSync(KEY, SALT, 64).toString('hex');

function makeCtx(): HandlerContext {
  const catalog: LoadedCatalog = {
    catalogues: [
      { id: 'default', name: 'default', public: true },
      { id: 'premium-pack', name: 'Premium Pack', public: false, salt: SALT, hash: HASH },
    ],
    songs: [fakeSong('creep', 'default'), fakeSong('bonus', 'premium-pack')],
  };
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog } satisfies HandlerContext;
}

/** Sets up a session with a connected host and returns the ctx + host socket, capturing sent + broadcast messages. */
function withHostSession() {
  const ctx = makeCtx();
  const session = ctx.sessionStore.create('host-1');
  session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
  const hostSocket = fakeSocket();
  ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

  const sent: ServerMessage[] = [];
  ctx.connections.send = (_socket, message) => sent.push(message as ServerMessage);
  const broadcasts: ServerMessage[] = [];
  ctx.connections.broadcast = (_code, build) => broadcasts.push(build('host-1'));

  return { ctx, session, hostSocket, sent, broadcasts };
}

describe('catalogue-unlock', () => {
  it('unlocks with the correct key and broadcasts session-state + catalog', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = withHostSession();

    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', catalogueId: 'premium-pack', key: KEY });

    expect(session.unlockedCatalogueIds).toEqual(['premium-pack']);
    expect(sent).toEqual([]);
    expect(broadcasts.map((m) => m.type)).toEqual(['session-state', 'catalog']);
    const catalogMsg = broadcasts.find((m) => m.type === 'catalog');
    expect(catalogMsg && catalogMsg.type === 'catalog' && catalogMsg.songs.map((s) => s.id).sort()).toEqual(['bonus', 'creep']);
  });

  it('rejects a wrong key with an error to the requester only, no broadcast, no state change', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = withHostSession();

    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', catalogueId: 'premium-pack', key: 'wrong' });

    expect(session.unlockedCatalogueIds).toEqual([]);
    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });

  it('rejects a non-host sender with an error', () => {
    const { ctx, session, sent, broadcasts } = withHostSession();
    session.participants.push({ id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 });
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    handleCatalogueUnlock(ctx, memberSocket, { type: 'catalogue-unlock', catalogueId: 'premium-pack', key: KEY });

    expect(session.unlockedCatalogueIds).toEqual([]);
    expect(broadcasts).toEqual([]);
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can unlock a catalogue' }]);
  });

  it('rejects an unknown catalogueId with an error', () => {
    const { ctx, hostSocket, sent, broadcasts } = withHostSession();

    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', catalogueId: 'nope', key: KEY });

    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });

  it('rejects a public catalogue (no key record) with an error', () => {
    const { ctx, hostSocket, sent, broadcasts } = withHostSession();

    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', catalogueId: 'default', key: KEY });

    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });

  it('rejects an already-unlocked catalogue with an error', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = withHostSession();
    session.unlockedCatalogueIds.push('premium-pack');

    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', catalogueId: 'premium-pack', key: KEY });

    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });
});
