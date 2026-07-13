import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { CatalogueMembership, ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import { NullAccountStore } from './accounts/null-store.js';
import type { HandlerContext } from './handlers/context.js';
import type { LoadedCatalog, LoadedCatalogue } from './catalog-loader.js';
import { membershipDerivedUnlocks, rederiveHostMembershipUnlocks, seedHostMembershipUnlocks } from './membership-unlock.js';

const CATALOGUES: LoadedCatalogue[] = [
  { id: 'default', name: 'default', public: true },
  { id: 'kinda-bad', name: 'Kinda Bad', public: false, salt: 's', hash: 'h', epoch: 2 },
];

function membership(catalogueId: string, keyEpoch: number | null, grantedVia: CatalogueMembership['grantedVia'] = 'key'): CatalogueMembership {
  return { id: 'm', userId: 'u', catalogueId, grantedVia, keyEpoch, grantedAt: 0 };
}

describe('membershipDerivedUnlocks — epoch-current filtering (T014, S5)', () => {
  it('includes a key membership whose keyEpoch matches the catalogue current epoch', () => {
    expect(membershipDerivedUnlocks([membership('kinda-bad', 2)], CATALOGUES)).toEqual(['kinda-bad']);
  });

  it('excludes a stale-epoch key membership (keyEpoch below current)', () => {
    expect(membershipDerivedUnlocks([membership('kinda-bad', 1)], CATALOGUES)).toEqual([]);
  });

  it('excludes a membership to a catalogue that is not loaded (inert dangling row, S8)', () => {
    expect(membershipDerivedUnlocks([membership('ghost', 2)], CATALOGUES)).toEqual([]);
  });

  it('includes an owner membership regardless of epoch (not key-derived)', () => {
    expect(membershipDerivedUnlocks([membership('kinda-bad', null, 'owner')], CATALOGUES)).toEqual(['kinda-bad']);
  });
});

function ctxWith(memberships: CatalogueMembership[]) {
  const store = new NullAccountStore();
  store.getMembershipsByUser = vi.fn(async () => memberships);
  const catalog: LoadedCatalog = { catalogues: CATALOGUES, songs: [] };
  const ctx = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: store, catalog } satisfies HandlerContext;
  const broadcasts: ServerMessage[] = [];
  ctx.connections.broadcast = (_code, build) => broadcasts.push(build('host-1'));
  return { ctx, broadcasts };
}

function attachHost(ctx: HandlerContext, code: string, userId: string | null, participantId = 'host-1') {
  const socket = { send: () => {} } as unknown as WebSocket;
  ctx.connections.stampUserId(socket, userId);
  ctx.connections.attach(socket, { sessionCode: code, participantId });
  return socket;
}

describe('seedHostMembershipUnlocks — host-only auto-unlock (T014)', () => {
  it('a signed-in host with a current-epoch membership auto-unlocks on join', async () => {
    const { ctx, broadcasts } = ctxWith([membership('kinda-bad', 2)]);
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'H', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    const socket = attachHost(ctx, session.code, 'user-1');

    await seedHostMembershipUnlocks(ctx, session.code, socket);

    expect(session.unlockedCatalogueIds).toEqual(['kinda-bad']);
    expect(broadcasts.map((m) => m.type)).toEqual(['session-state', 'catalog']);
  });

  it('a stale-epoch membership does NOT auto-unlock', async () => {
    const { ctx, broadcasts } = ctxWith([membership('kinda-bad', 1)]);
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'H', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    const socket = attachHost(ctx, session.code, 'user-1');

    await seedHostMembershipUnlocks(ctx, session.code, socket);

    expect(session.unlockedCatalogueIds).toEqual([]);
    expect(broadcasts).toEqual([]);
  });

  it('a NON-host authenticated participant does NOT cause unlock (host-only, §12.1)', async () => {
    const { ctx, broadcasts } = ctxWith([membership('kinda-bad', 2)]);
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'H', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    // The signed-in participant is a member, not the host.
    const memberSocket = attachHost(ctx, session.code, 'user-2', 'member-1');

    await seedHostMembershipUnlocks(ctx, session.code, memberSocket);

    expect(session.unlockedCatalogueIds).toEqual([]);
    expect(broadcasts).toEqual([]);
  });

  it('an anonymous host unlocks nothing', async () => {
    const { ctx } = ctxWith([membership('kinda-bad', 2)]);
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'H', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });
    const socket = attachHost(ctx, session.code, null);

    await seedHostMembershipUnlocks(ctx, session.code, socket);

    expect(session.unlockedCatalogueIds).toEqual([]);
  });
});

describe('rederiveHostMembershipUnlocks — re-lock on host change (T015, S4)', () => {
  it('succession to a non-member re-locks a membership-only catalogue while a key-typed one stays', async () => {
    // New host (participant B) is a member of nothing.
    const { ctx, broadcasts } = ctxWith([]);
    const session = ctx.sessionStore.create('B'); // hostId is already B (post-succession)
    session.participants.push({ id: 'B', displayName: 'B', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 });

    // The session currently has 'kinda-bad' unlocked by the departed host's
    // membership, and 'default'... use another catalogue: 'other'. Represent a
    // key-typed unlock of 'kinda-bad'-style; here 'kinda-bad' is membership-only
    // and a separate key-typed catalogue stays. Register a key-typed unlock.
    ctx.sessionStore.recordKeyUnlock(session.code, 'keyed-pack');
    session.unlockedCatalogueIds = ['kinda-bad', 'keyed-pack']; // kinda-bad from departed host's membership
    // Make 'keyed-pack' a loaded catalogue so it isn't dropped as unknown.
    ctx.catalog.catalogues.push({ id: 'keyed-pack', name: 'Keyed', public: false, salt: 's', hash: 'h', epoch: 1 });
    attachHost(ctx, session.code, 'user-B', 'B');

    await rederiveHostMembershipUnlocks(ctx, session.code);

    // kinda-bad (membership-only, new host isn't a member) re-locks; keyed-pack
    // (typed this session) persists.
    expect(session.unlockedCatalogueIds).toEqual(['keyed-pack']);
    expect(broadcasts.map((m) => m.type)).toEqual(['session-state', 'catalog']);
  });

  it('succession to a member keeps that catalogue unlocked', async () => {
    const { ctx } = ctxWith([membership('kinda-bad', 2)]); // new host IS a member
    const session = ctx.sessionStore.create('B');
    session.participants.push({ id: 'B', displayName: 'B', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 });
    session.unlockedCatalogueIds = ['kinda-bad'];
    attachHost(ctx, session.code, 'user-B', 'B');

    await rederiveHostMembershipUnlocks(ctx, session.code);

    expect(session.unlockedCatalogueIds).toEqual(['kinda-bad']);
  });

  it('with no DB (anonymous new host) only the key-typed slice remains — a no-op on a key-only session', async () => {
    const { ctx, broadcasts } = ctxWith([]);
    const session = ctx.sessionStore.create('B');
    session.participants.push({ id: 'B', displayName: 'B', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 });
    ctx.sessionStore.recordKeyUnlock(session.code, 'kinda-bad');
    session.unlockedCatalogueIds = ['kinda-bad']; // was key-typed this session
    attachHost(ctx, session.code, null, 'B'); // anonymous host

    await rederiveHostMembershipUnlocks(ctx, session.code);

    expect(session.unlockedCatalogueIds).toEqual(['kinda-bad']); // key-typed stays
    expect(broadcasts).toEqual([]); // unchanged ⇒ no re-broadcast
  });
});
