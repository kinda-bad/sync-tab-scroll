import { describe, expect, it, vi } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
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
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog } satisfies HandlerContext;
}

/** Sets up a session with a connected host and returns the ctx + host socket, capturing sent + broadcast messages. */
function withHostSession() {
  const ctx = makeCtx();
  const session = ctx.sessionStore.create('host-1');
  session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});
  const hostSocket = fakeSocket();
  ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

  const sent: ServerMessage[] = [];
  ctx.connections.send = (_socket, message) => sent.push(message as ServerMessage);
  const broadcasts: ServerMessage[] = [];
  ctx.connections.broadcast = (_code, build) => broadcasts.push(build('host-1'));

  return { ctx, session, hostSocket, sent, broadcasts };
}

describe('catalogue-unlock', () => {
  it('resolves the key against the locked catalogue and broadcasts session-state + catalog', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = withHostSession();

    // No catalogueId supplied — the server figures out which locked catalogue
    // the key belongs to.
    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', key: KEY });

    // Only the matched private catalogue is unlocked; the public 'default'
    // catalogue is never added by a key unlock.
    expect(session.unlockedCatalogueIds).toEqual(['premium-pack']);
    expect(sent).toEqual([]);
    expect(broadcasts.map((m) => m.type)).toEqual(['session-state', 'catalog']);
    const catalogMsg = broadcasts.find((m) => m.type === 'catalog');
    expect(catalogMsg && catalogMsg.type === 'catalog' && catalogMsg.songs.map((s) => s.id).sort()).toEqual(['bonus', 'creep']);
  });

  it('rejects a wrong key with an error to the requester only, no broadcast, no state change', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = withHostSession();

    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', key: 'wrong' });

    expect(session.unlockedCatalogueIds).toEqual([]);
    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });

  it('rejects a non-host sender with an error', () => {
    const { ctx, session, sent, broadcasts } = withHostSession();
    session.participants.push({ id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null});
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    handleCatalogueUnlock(ctx, memberSocket, { type: 'catalogue-unlock', key: KEY });

    expect(session.unlockedCatalogueIds).toEqual([]);
    expect(broadcasts).toEqual([]);
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can unlock a catalogue' }]);
  });

  it('errors and unlocks nothing when no locked catalogue exists (only public)', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = withHostSession();
    // Drop the only private catalogue: nothing is left for any key to match, so
    // even the "correct" key must fail — a key never unlocks a public catalogue.
    ctx.catalog.catalogues = ctx.catalog.catalogues.filter((c) => c.public);

    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', key: KEY });

    expect(session.unlockedCatalogueIds).toEqual([]);
    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });

  it('does not re-unlock an already-unlocked catalogue (matches nothing left, errors, no duplicate)', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = withHostSession();
    session.unlockedCatalogueIds.push('premium-pack');

    // premium-pack is the only locked catalogue and it is already unlocked, so
    // the key matches nothing still-locked — a terse error, and no duplicate id.
    handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', key: KEY });

    expect(session.unlockedCatalogueIds).toEqual(['premium-pack']);
    expect(broadcasts).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('error');
  });

  describe('persisting the unlock for a logged-in host (T013)', () => {
    /** Installs a spyable enabled store and stamps a userId on the host connection. */
    function withSignedInHost(userId: string | null, upsert = vi.fn(async () => null)) {
      const h = withHostSession();
      const store = new NullAccountStore();
      store.upsertMembership = upsert; // spy on the best-effort membership write
      h.ctx.accountStore = store;
      // Give the premium-pack catalogue a non-default current epoch (S5).
      const premium = h.ctx.catalog.catalogues.find((c) => c.id === 'premium-pack')!;
      (premium as { epoch?: number }).epoch = 2;
      // Re-attach the host connection carrying the resolved userId (as the WS
      // upgrade would have stamped it — T011).
      h.ctx.connections.stampUserId(h.hostSocket, userId);
      h.ctx.connections.attach(h.hostSocket, { sessionCode: h.session.code, participantId: 'host-1' });
      return { ...h, upsert };
    }

    it('a signed-in host key-unlock persists a CatalogueMembership at the current epoch (S5, S8)', () => {
      const { ctx, session, hostSocket, upsert } = withSignedInHost('user-1');

      handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', key: KEY });

      expect(session.unlockedCatalogueIds).toEqual(['premium-pack']);
      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert).toHaveBeenCalledWith({ userId: 'user-1', catalogueId: 'premium-pack', grantedVia: 'key', keyEpoch: 2 });
    });

    it('an anonymous host key-unlock persists nothing (unchanged behavior)', () => {
      const { ctx, session, hostSocket, upsert } = withSignedInHost(null);

      handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', key: KEY });

      expect(session.unlockedCatalogueIds).toEqual(['premium-pack']);
      expect(upsert).not.toHaveBeenCalled();
    });

    it('still unlocks the live session when the membership write fails (DB down, best-effort, S7)', () => {
      const failing = vi.fn(async () => {
        throw new Error('DB down');
      });
      const { ctx, session, hostSocket, broadcasts } = withSignedInHost('user-1', failing);

      expect(() =>
        handleCatalogueUnlock(ctx, hostSocket, { type: 'catalogue-unlock', key: KEY }),
      ).not.toThrow();

      expect(session.unlockedCatalogueIds).toEqual(['premium-pack']);
      expect(broadcasts.map((m) => m.type)).toEqual(['session-state', 'catalog']);
    });
  });
});
