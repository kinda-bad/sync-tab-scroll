import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import { NullAccountStore } from './accounts/null-store.js';
import type { HandlerContext } from './handlers/context.js';
import type { LoadedCatalog, LoadedCatalogue } from './catalog-loader.js';
import { resolveOwnedCatalogueIds, sendOwnerVisibleCatalog } from './owner-visibility.js';

const CATALOGUES: LoadedCatalogue[] = [
  { id: 'default', name: 'default', public: true },
  { id: 'kinda-bad', name: 'Kinda Bad', public: false, salt: 's', hash: 'h', epoch: 2 },
];

function ctxWithOwnerships(catalogueIds: string[]) {
  const store = new NullAccountStore();
  store.getOwnershipsByOwner = vi.fn(async (ownerId: string) =>
    catalogueIds.map((catalogueId) => ({ id: 'o', catalogueId, ownerId, createdAt: 0 })),
  );
  const catalog: LoadedCatalog = { catalogues: CATALOGUES, songs: [] };
  const ctx = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: store, catalog } satisfies HandlerContext;
  return ctx;
}

function attach(ctx: HandlerContext, code: string, userId: string | null, participantId = 'p-1') {
  const socket = { send: vi.fn() } as unknown as WebSocket;
  ctx.connections.stampUserId(socket, userId);
  ctx.connections.attach(socket, { sessionCode: code, participantId });
  return socket;
}

describe('resolveOwnedCatalogueIds (T006)', () => {
  it('returns the catalogue ids a userId owns', async () => {
    const ctx = ctxWithOwnerships(['kinda-bad']);
    expect(await resolveOwnedCatalogueIds(ctx, 'user-1')).toEqual(['kinda-bad']);
  });

  it('returns [] for a null userId (anonymous) without touching the store', async () => {
    const ctx = ctxWithOwnerships(['kinda-bad']);
    expect(await resolveOwnedCatalogueIds(ctx, null)).toEqual([]);
    expect(ctx.accountStore.getOwnershipsByOwner).not.toHaveBeenCalled();
  });
});

describe('sendOwnerVisibleCatalog (T006)', () => {
  it('an owner joining a fresh session sees their own not-yet-unlocked-by-anyone catalogue', async () => {
    const ctx = ctxWithOwnerships(['kinda-bad']);
    const session = ctx.sessionStore.create('p-1');
    session.participants.push({ id: 'p-1', displayName: 'Owner', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});
    const socket = attach(ctx, session.code, 'user-1');

    await sendOwnerVisibleCatalog(ctx, socket, session, 'user-1');

    expect(socket.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((socket.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as string) as ServerMessage;
    expect(sent.type).toBe('catalog');
    expect((sent as { catalogues: { id: string }[] }).catalogues.map((c) => c.id).sort()).toEqual(['default', 'kinda-bad']);
  });

  it('does not send a second message when ownership adds nothing beyond what is already visible', async () => {
    const ctx = ctxWithOwnerships([]); // owns nothing
    const session = ctx.sessionStore.create('p-1');
    session.participants.push({ id: 'p-1', displayName: 'Member', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});
    const socket = attach(ctx, session.code, 'user-1');

    await sendOwnerVisibleCatalog(ctx, socket, session, 'user-1');

    expect(socket.send).not.toHaveBeenCalled();
  });

  it('an anonymous joiner triggers no store call and no send', async () => {
    const ctx = ctxWithOwnerships(['kinda-bad']);
    const session = ctx.sessionStore.create('p-1');
    session.participants.push({ id: 'p-1', displayName: 'Anon', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});
    const socket = attach(ctx, session.code, null);

    await sendOwnerVisibleCatalog(ctx, socket, session, null);

    expect(ctx.accountStore.getOwnershipsByOwner).not.toHaveBeenCalled();
    expect(socket.send).not.toHaveBeenCalled();
  });
});
