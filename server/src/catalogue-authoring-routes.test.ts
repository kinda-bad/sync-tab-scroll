import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NullAccountStore } from './accounts/null-store.js';
import type { AccountStore } from './accounts/store.js';
import { createCatalogueAuthoringRequestHandler, type CatalogueAuthoringRouteOptions } from './catalogue-authoring-routes.js';

function startServer(overrides: Partial<CatalogueAuthoringRouteOptions> & { store: AccountStore; catalogRoot: string }) {
  const handler = createCatalogueAuthoringRequestHandler(overrides as CatalogueAuthoringRouteOptions);
  const server = http.createServer((req, res) => {
    if (handler(req, res)) return;
    res.writeHead(404).end();
  });
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

function signedInStore(userId = 'user-1'): AccountStore {
  const store = new NullAccountStore();
  store.getAuthSession = vi.fn(async () => ({ id: 's', userId, createdAt: 0, expiresAt: Date.now() + 100_000, revokedAt: null }));
  store.getUser = vi.fn(async () => ({ id: userId, oauthProvider: 'google' as const, oauthSubject: 'sub', displayName: 'U', email: null, createdAt: 0 }));
  return store;
}

describe('POST /catalogues — create catalogue (T012)', () => {
  let catalogRoot: string;
  let srv: ReturnType<typeof startServer>;

  beforeEach(() => {
    catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-authoring-'));
  });
  afterEach(async () => {
    await srv?.close();
    fs.rmSync(catalogRoot, { recursive: true, force: true });
  });

  it('rejects with 401 when not signed in', async () => {
    srv = startServer({ store: new NullAccountStore(), catalogRoot });
    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'my-band', name: 'My Band', visibility: 'public' }),
    });
    expect(res.status).toBe(401);
  });

  it('creates a public catalogue on disk, grants ownership + owner membership, returns 200', async () => {
    const store = signedInStore();
    store.createOwnership = vi.fn(async (input) => ({ id: 'o1', createdAt: 0, ...input }));
    store.upsertMembership = vi.fn(async (input) => ({ id: 'm1', grantedAt: 0, ...input }));
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ slug: 'my-band', name: 'My Band', visibility: 'public' }),
    });

    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(catalogRoot, 'my-band'))).toBe(true);
    expect(store.createOwnership).toHaveBeenCalledWith({ catalogueId: 'my-band', ownerId: 'user-1' });
    expect(store.upsertMembership).toHaveBeenCalledWith({ userId: 'user-1', catalogueId: 'my-band', grantedVia: 'owner', keyEpoch: null });
  });

  it('creates a private catalogue requiring a key, 400 without one', async () => {
    const store = signedInStore();
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ slug: 'secret-band', name: 'Secret Band', visibility: 'private' }),
    });
    expect(res.status).toBe(400);
  });

  it('a private catalogue with a key writes catalogue.json (the gate record)', async () => {
    const store = signedInStore();
    store.createOwnership = vi.fn(async (input) => ({ id: 'o1', createdAt: 0, ...input }));
    store.upsertMembership = vi.fn(async (input) => ({ id: 'm1', grantedAt: 0, ...input }));
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ slug: 'secret-band', name: 'Secret Band', visibility: 'private', key: 'sekrit' }),
    });
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(catalogRoot, 'secret-band', 'catalogue.json'))).toBe(true);
  });

  // T008: applies the generalized validateField (input-validation.ts) to
  // slug/name/key before proceeding, rejecting with the route's existing
  // 400 shape — same reject-not-sanitize contract as the WS handlers
  // (infrastructure.md Input Validation).
  it('rejects an invalid slug (control/HTML chars) with 400 and does not create the directory', async () => {
    const store = signedInStore();
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ slug: '<script>', name: 'My Band', visibility: 'public' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
    expect(fs.existsSync(path.join(catalogRoot, '<script>'))).toBe(false);
  });

  it('rejects an invalid name (control/HTML chars) with 400', async () => {
    const store = signedInStore();
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ slug: 'my-band', name: '<b>My Band</b>', visibility: 'public' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it('rejects an invalid activation key (control/HTML chars) with 400 for a private catalogue', async () => {
    const store = signedInStore();
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ slug: 'my-band', name: 'My Band', visibility: 'private', key: '<b>key</b>' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it('rejects a duplicate slug with 409', async () => {
    const store = signedInStore();
    store.createOwnership = vi.fn(async (input) => ({ id: 'o1', createdAt: 0, ...input }));
    store.upsertMembership = vi.fn(async (input) => ({ id: 'm1', grantedAt: 0, ...input }));
    srv = startServer({ store, catalogRoot });
    fs.mkdirSync(path.join(catalogRoot, 'my-band'), { recursive: true });

    const res = await fetch(`${srv.base}/catalogues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ slug: 'my-band', name: 'My Band', visibility: 'public' }),
    });
    expect(res.status).toBe(409);
  });
});

describe('Invite by link (T016/T017)', () => {
  let catalogRoot: string;
  let srv: ReturnType<typeof startServer>;

  beforeEach(() => {
    catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-authoring-invite-'));
  });
  afterEach(async () => {
    await srv?.close();
    fs.rmSync(catalogRoot, { recursive: true, force: true });
  });

  it('POST /catalogues/:id/invite is owner-only (403 for a non-owner)', async () => {
    const store = signedInStore();
    store.isOwner = vi.fn(async () => false);
    srv = startServer({ store, catalogRoot, sessionCookieSecret: 'test-secret' });

    const res = await fetch(`${srv.base}/catalogues/my-band/invite`, { method: 'POST', headers: { Cookie: 'sts_session=s' } });
    expect(res.status).toBe(403);
  });

  it('an owner generates a redeemable invite token', async () => {
    const store = signedInStore('owner-1');
    store.isOwner = vi.fn(async () => true);
    srv = startServer({ store, catalogRoot, sessionCookieSecret: 'test-secret' });

    const genRes = await fetch(`${srv.base}/catalogues/my-band/invite`, { method: 'POST', headers: { Cookie: 'sts_session=s' } });
    expect(genRes.status).toBe(200);
    const { token } = (await genRes.json()) as { token: string };
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  it('redeeming a valid token grants CatalogueOwnership + CatalogueMembership(grantedVia:invite) in one action', async () => {
    const ownerStore = signedInStore('owner-1');
    ownerStore.isOwner = vi.fn(async () => true);
    srv = startServer({ store: ownerStore, catalogRoot, sessionCookieSecret: 'test-secret' });
    const genRes = await fetch(`${srv.base}/catalogues/my-band/invite`, { method: 'POST', headers: { Cookie: 'sts_session=s' } });
    const { token } = (await genRes.json()) as { token: string };
    await srv.close();

    const redeemStore = signedInStore('friend-1');
    redeemStore.createOwnership = vi.fn(async (input) => ({ id: 'o2', createdAt: 0, ...input }));
    redeemStore.upsertMembership = vi.fn(async (input) => ({ id: 'm2', grantedAt: 0, ...input }));
    srv = startServer({ store: redeemStore, catalogRoot, sessionCookieSecret: 'test-secret' });

    const res = await fetch(`${srv.base}/invites/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ token }),
    });
    expect(res.status).toBe(200);
    expect(redeemStore.createOwnership).toHaveBeenCalledWith({ catalogueId: 'my-band', ownerId: 'friend-1' });
    expect(redeemStore.upsertMembership).toHaveBeenCalledWith({ userId: 'friend-1', catalogueId: 'my-band', grantedVia: 'invite', keyEpoch: null });
  });

  it('rejects a tampered token with 400', async () => {
    const store = signedInStore('friend-1');
    srv = startServer({ store, catalogRoot });
    const res = await fetch(`${srv.base}/invites/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: 'sts_session=s' },
      body: JSON.stringify({ token: 'not-a-real-token' }),
    });
    expect(res.status).toBe(400);
  });

  it('redeeming requires sign-in (401)', async () => {
    srv = startServer({ store: new NullAccountStore(), catalogRoot });
    const res = await fetch(`${srv.base}/invites/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'whatever' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /catalogues/:id/owners — co-owners roster (T018)', () => {
  let catalogRoot: string;
  let srv: ReturnType<typeof startServer>;

  beforeEach(() => {
    catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-authoring-'));
  });
  afterEach(async () => {
    await srv?.close();
    fs.rmSync(catalogRoot, { recursive: true, force: true });
  });

  it('requires sign-in (401)', async () => {
    srv = startServer({ store: new NullAccountStore(), catalogRoot });
    const res = await fetch(`${srv.base}/catalogues/my-band/owners`);
    expect(res.status).toBe(401);
  });

  it('is owner-only (403 for a non-owner)', async () => {
    const store = signedInStore();
    store.isOwner = vi.fn(async () => false);
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues/my-band/owners`, { headers: { Cookie: 'sts_session=s' } });
    expect(res.status).toBe(403);
  });

  it('resolves each ownership row to a userId + displayName', async () => {
    const store = signedInStore('owner-1');
    store.isOwner = vi.fn(async () => true);
    store.getOwnershipsByCatalogue = vi.fn(async () => [
      { id: 'o1', catalogueId: 'my-band', ownerId: 'owner-1', createdAt: 0 },
      { id: 'o2', catalogueId: 'my-band', ownerId: 'owner-2', createdAt: 0 },
    ]);
    store.getUser = vi.fn(async (id: string) => ({ id, oauthProvider: 'google' as const, oauthSubject: 'sub', displayName: id === 'owner-1' ? 'Ada' : 'Bo', email: null, createdAt: 0 }));
    srv = startServer({ store, catalogRoot });

    const res = await fetch(`${srv.base}/catalogues/my-band/owners`, { headers: { Cookie: 'sts_session=s' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      owners: [
        { userId: 'owner-1', displayName: 'Ada' },
        { userId: 'owner-2', displayName: 'Bo' },
      ],
    });
  });
});
