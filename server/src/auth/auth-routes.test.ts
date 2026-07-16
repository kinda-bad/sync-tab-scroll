import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { containerRuntimeAvailable, withTestDatabase } from '../accounts/pg-test-container.js';
import { NullAccountStore } from '../accounts/null-store.js';
import { PgAccountStore } from '../accounts/pg-store.js';
import type { AccountStore } from '../accounts/store.js';
import { createAuthRequestHandler } from './auth-routes.js';
import type { OAuthProvider, OAuthProviderRegistry } from './providers.js';

const PUBLIC_BASE_URL = 'http://localhost:5173';

/** A mock provider — no network. Records the params it received and returns a fixed profile. */
function mockProvider(subject = 'sub-123'): OAuthProvider & { seen: Record<string, unknown> } {
  const seen: Record<string, unknown> = {};
  return {
    seen,
    buildAuthorizeUrl(opts) {
      seen.authorize = opts;
      return `https://provider.test/authorize?state=${encodeURIComponent(opts.state)}`;
    },
    async exchangeCodeForProfile(opts) {
      seen.exchange = opts;
      return { provider: 'google', subject, displayName: 'Ada', email: 'ada@example.com' };
    },
  };
}

function registry(google: OAuthProvider): OAuthProviderRegistry {
  return { google, github: google };
}

function startServer(store: AccountStore, providers: OAuthProviderRegistry) {
  const handler = createAuthRequestHandler({
    store,
    config: { sessionCookieSecret: 'test-secret', publicBaseUrl: PUBLIC_BASE_URL },
    providers,
  });
  const server = http.createServer((req, res) => {
    if (handler(req, res)) return;
    res.writeHead(404).end();
  });
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

function setCookieValue(res: Response, name: string): string | undefined {
  const raw = res.headers.getSetCookie?.() ?? [];
  const hit = raw.find((c) => c.startsWith(`${name}=`));
  return hit?.split(';')[0].split('=').slice(1).join('=');
}

describe('auth routes — DB-optional inertness (T008)', () => {
  let srv: { base: string; close: () => Promise<void> };
  beforeEach(() => {
    srv = startServer(new NullAccountStore(), registry(mockProvider()));
  });
  afterEach(() => srv.close());

  it('login is inert (404) with no DB', async () => {
    const res = await fetch(`${srv.base}/auth/google/login`, { redirect: 'manual' });
    expect(res.status).toBe(404);
  });

  it('callback is inert (404) with no DB', async () => {
    const res = await fetch(`${srv.base}/auth/google/callback?code=x&state=y`, { redirect: 'manual' });
    expect(res.status).toBe(404);
  });

  it('logout is inert (404) with no DB', async () => {
    const res = await fetch(`${srv.base}/auth/logout`, { redirect: 'manual', method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('/me reports accounts unavailable + anonymous with no DB', async () => {
    const res = await fetch(`${srv.base}/me`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accountsEnabled: false, user: null, ownedCatalogueIds: [] });
  });
});

describe('/me — ownedCatalogueIds (T011)', () => {
  it('reports the signed-in user\'s owned catalogue ids', async () => {
    const store = new NullAccountStore();
    store.getAuthSession = async () => ({ id: 's', userId: 'user-1', createdAt: 0, expiresAt: Date.now() + 100_000, revokedAt: null });
    store.getUser = async () => ({ id: 'user-1', oauthProvider: 'google', oauthSubject: 'sub', displayName: 'Ada', email: null, createdAt: 0 });
    store.getOwnershipsByOwner = async () => [
      { id: 'o1', catalogueId: 'my-band', ownerId: 'user-1', createdAt: 0 },
      { id: 'o2', catalogueId: 'other-band', ownerId: 'user-1', createdAt: 0 },
    ];

    const srv = startServer(store, registry(mockProvider()));
    try {
      const res = await fetch(`${srv.base}/me`, { headers: { cookie: 'sts_session=s' } });
      const body = await res.json();
      expect(body.ownedCatalogueIds).toEqual(['my-band', 'other-band']);
    } finally {
      await srv.close();
    }
  });

  it('reports an empty array when signed out (no store call needed to resolve ownership)', async () => {
    const store = new NullAccountStore();
    const srv = startServer(store, registry(mockProvider()));
    try {
      const res = await fetch(`${srv.base}/me`);
      const body = await res.json();
      expect(body.ownedCatalogueIds).toEqual([]);
    } finally {
      await srv.close();
    }
  });
});

describe.skipIf(!containerRuntimeAvailable())('auth routes — full OAuth flow against a mock provider (T008)', () => {
  const withServer = (fn: (srv: { base: string }, store: PgAccountStore, pool: Pool) => Promise<void>) =>
    withTestDatabase(async (pool) => {
      const store = new PgAccountStore(pool);
      const provider = mockProvider();
      const srv = startServer(store, registry(provider));
      try {
        await fn(srv, store, pool);
      } finally {
        await srv.close();
      }
    });

  it('login → callback sets an HTTP-only session cookie and /me returns the user; logout revokes it', async () => {
    await withServer(async (srv) => {
      // 1. login → redirect to provider + transaction cookie
      const login = await fetch(`${srv.base}/auth/google/login`, { redirect: 'manual' });
      expect(login.status).toBe(302);
      const authorizeUrl = new URL(login.headers.get('location')!);
      expect(authorizeUrl.origin + authorizeUrl.pathname).toBe('https://provider.test/authorize');
      const state = authorizeUrl.searchParams.get('state')!;
      expect(state.length).toBeGreaterThan(20);
      const txCookie = login.headers.getSetCookie!().find((c) => c.startsWith('sts_auth_tx='))!;
      expect(txCookie).toMatch(/HttpOnly/i);

      // 2. callback with the matching state + tx cookie → session cookie + redirect home
      const cb = await fetch(`${srv.base}/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`, {
        redirect: 'manual',
        headers: { cookie: txCookie.split(';')[0] },
      });
      expect(cb.status).toBe(302);
      expect(cb.headers.get('location')).toBe(`${PUBLIC_BASE_URL}/`);
      const sessionSetCookie = cb.headers.getSetCookie!().find((c) => c.startsWith('sts_session='))!;
      expect(sessionSetCookie).toMatch(/HttpOnly/i);
      expect(sessionSetCookie).toMatch(/Secure/i);
      expect(sessionSetCookie).toMatch(/SameSite=Lax/i);
      const sessionId = setCookieValue(cb, 'sts_session')!;
      expect(sessionId.length).toBeGreaterThan(10);

      // 3. /me with the session cookie → the user
      const me = await fetch(`${srv.base}/me`, { headers: { cookie: `sts_session=${sessionId}` } });
      const body = await me.json();
      expect(body.accountsEnabled).toBe(true);
      expect(body.user.displayName).toBe('Ada');
      expect(body.user.oauthProvider).toBe('google');
      // T011: /me reports the signed-in user's owned catalogues (empty here — none created yet).
      expect(body.ownedCatalogueIds).toEqual([]);

      // 4. logout revokes; /me is anonymous afterward (revoked session rejected)
      const logout = await fetch(`${srv.base}/auth/logout`, {
        method: 'POST',
        redirect: 'manual',
        headers: { cookie: `sts_session=${sessionId}` },
      });
      expect([200, 302]).toContain(logout.status);
      expect(logout.headers.getSetCookie!().some((c) => c.startsWith('sts_session=') && /Max-Age=0/i.test(c))).toBe(true);

      const meAfter = await fetch(`${srv.base}/me`, { headers: { cookie: `sts_session=${sessionId}` } });
      expect((await meAfter.json()).user).toBeNull();
    });
  }, 120_000);

  it('rejects a callback with a missing or mismatched state (login-CSRF, S1)', async () => {
    await withServer(async (srv) => {
      // No transaction cookie at all
      const noTx = await fetch(`${srv.base}/auth/google/callback?code=abc&state=whatever`, { redirect: 'manual' });
      expect(noTx.status).toBe(400);

      // Valid tx cookie but a tampered state param
      const login = await fetch(`${srv.base}/auth/google/login`, { redirect: 'manual' });
      const txCookie = login.headers.getSetCookie!().find((c) => c.startsWith('sts_auth_tx='))!.split(';')[0];
      const badState = await fetch(`${srv.base}/auth/google/callback?code=abc&state=tampered`, {
        redirect: 'manual',
        headers: { cookie: txCookie },
      });
      expect(badState.status).toBe(400);
    });
  }, 120_000);

  it('treats an expired session as anonymous', async () => {
    await withServer(async (srv, store) => {
      const user = await store.upsertUser({ oauthProvider: 'google', oauthSubject: 'exp', displayName: 'E', email: null });
      const session = await store.createAuthSession({ userId: user!.id, expiresAt: Date.now() - 1000 });
      const me = await fetch(`${srv.base}/me`, { headers: { cookie: `sts_session=${session!.id}` } });
      expect((await me.json()).user).toBeNull();
    });
  }, 120_000);
});
