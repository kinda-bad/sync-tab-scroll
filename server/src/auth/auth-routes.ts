import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AccountConfig } from '../config.js';
import type { AccountStore } from '../accounts/store.js';
import {
  AUTH_TX_COOKIE,
  SESSION_COOKIE,
  clearCookie,
  parseCookies,
  serializeCookie,
  signValue,
  verifySignedValue,
} from './cookies.js';
import { constantTimeEqual, createAuthorizationParams } from './oauth-helpers.js';
import { SESSION_TTL_MS, resolveAuth } from './session.js';
import type { OAuthProviderName, OAuthProviderRegistry } from './providers.js';

export interface AuthRouterOptions {
  store: AccountStore;
  config: Pick<AccountConfig, 'sessionCookieSecret' | 'publicBaseUrl'>;
  providers: OAuthProviderRegistry;
  /** T014: surfaced on `/me` so the client can render "Add song" absent (not disabled) when the server has the route gated off. Defaults to `true`, matching `config.ts`'s `songUploadEnabled` default. */
  songUploadEnabled?: boolean;
}

/** Signed OAuth transaction carried in `sts_auth_tx` between `/login` and `/callback`. */
interface AuthTransaction {
  provider: OAuthProviderName;
  state: string;
  nonce: string;
  codeVerifier: string;
}

const TX_TTL_SECONDS = 600;
const AUTH_ROUTE = /^\/auth\/(google|github)\/(login|callback)$/;

function json(res: ServerResponse, status: number, body: unknown, cookies: string[] = []): void {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('content-type', 'application/json');
  res.writeHead(status).end(JSON.stringify(body));
}

function redirect(res: ServerResponse, location: string, cookies: string[] = []): void {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('location', location);
  res.writeHead(302).end();
}

/**
 * Mounts the OAuth + session routes on the shared `http.Server`, **ahead of** the
 * catalog/static/404 chain (infrastructure.md OAuth flow): `/auth/<provider>/
 * login`, `/auth/<provider>/callback`, `/auth/logout`, `/me`. Returns a handler
 * that reports whether it handled the request (so the caller falls through to
 * the catalog/static chain otherwise).
 *
 * When the store is disabled (no DB), `/auth/*` are inert (404) and `/me`
 * reports `{ accountsEnabled: false, user: null }` — the account layer
 * self-disables with zero effect on the anonymous path (design §2).
 */
export function createAuthRequestHandler(opts: AuthRouterOptions): (req: IncomingMessage, res: ServerResponse) => boolean {
  const { store, config, providers, songUploadEnabled = true } = opts;
  const secure = config.publicBaseUrl.startsWith('https://');
  const sessionCookieOpts = { httpOnly: true, secure: true, sameSite: 'Lax' as const, path: '/' };

  async function handleMe(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const sessionId = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const resolved = await resolveAuth(store, sessionId);
    // T011: gates the "My catalogues" affordance — a signed-in owner's catalogue
    // ids, so the client can show/hide it without a second round-trip. Empty for
    // signed-out/unavailable (§13 S7 fail-soft — an ownership-lookup error never
    // blanks the whole /me response, just yields no owned catalogues).
    let ownedCatalogueIds: string[] = [];
    if (resolved) {
      try {
        const ownerships = await store.getOwnershipsByOwner(resolved.user.id);
        ownedCatalogueIds = ownerships.map((o) => o.catalogueId);
      } catch (err) {
        console.error('[auth] /me ownership lookup failed:', err instanceof Error ? err.message : err);
      }
    }
    json(res, 200, { accountsEnabled: store.enabled, user: resolved?.user ?? null, ownedCatalogueIds, songUploadEnabled });
  }

  async function handleLogin(provider: OAuthProviderName, res: ServerResponse): Promise<void> {
    const params = createAuthorizationParams();
    const redirectUri = `${config.publicBaseUrl}/auth/${provider}/callback`;
    const authorizeUrl = providers[provider].buildAuthorizeUrl({
      state: params.state,
      nonce: params.nonce,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      redirectUri,
    });
    const tx: AuthTransaction = { provider, state: params.state, nonce: params.nonce, codeVerifier: params.codeVerifier };
    const txCookie = serializeCookie(AUTH_TX_COOKIE, signValue(JSON.stringify(tx), config.sessionCookieSecret), {
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      path: '/',
      maxAgeSeconds: TX_TTL_SECONDS,
    });
    redirect(res, authorizeUrl, [txCookie]);
  }

  async function handleCallback(provider: OAuthProviderName, req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const home = `${config.publicBaseUrl}/`;
    const txRaw = parseCookies(req.headers.cookie)[AUTH_TX_COOKIE];
    const txJson = txRaw ? verifySignedValue(txRaw, config.sessionCookieSecret) : null;
    if (!txJson) {
      json(res, 400, { error: 'missing or invalid auth transaction' });
      return;
    }
    let tx: AuthTransaction;
    try {
      tx = JSON.parse(txJson) as AuthTransaction;
    } catch {
      json(res, 400, { error: 'malformed auth transaction' });
      return;
    }

    const state = url.searchParams.get('state') ?? '';
    const code = url.searchParams.get('code') ?? '';
    if (tx.provider !== provider || !constantTimeEqual(tx.state, state) || !code) {
      json(res, 400, { error: 'state mismatch or missing code' }, [clearTx()]);
      return;
    }

    let user;
    try {
      const profile = await providers[provider].exchangeCodeForProfile({
        code,
        codeVerifier: tx.codeVerifier,
        nonce: tx.nonce,
        redirectUri: `${config.publicBaseUrl}/auth/${provider}/callback`,
      });
      user = await store.upsertUser({
        oauthProvider: profile.provider,
        oauthSubject: profile.subject,
        displayName: profile.displayName,
        email: profile.email,
      });
    } catch (err) {
      console.error('[auth] callback exchange failed:', err instanceof Error ? err.message : err);
      // Fail soft to the anonymous app rather than surfacing a 500 to the user.
      redirect(res, home, [clearTx()]);
      return;
    }

    if (!user) {
      // Store unavailable mid-callback (§13 S7) — return to the app anonymous.
      redirect(res, home, [clearTx()]);
      return;
    }

    const session = await store.createAuthSession({ userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
    const cookies = [clearTx()];
    if (session) {
      cookies.push(serializeCookie(SESSION_COOKIE, session.id, { ...sessionCookieOpts, maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000) }));
    }
    redirect(res, home, cookies);
  }

  async function handleLogout(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const sessionId = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (sessionId) await store.revokeAuthSession(sessionId);
    json(res, 200, { ok: true }, [clearCookie(SESSION_COOKIE, sessionCookieOpts)]);
  }

  function clearTx(): string {
    return clearCookie(AUTH_TX_COOKIE, { httpOnly: true, secure, sameSite: 'Lax', path: '/' });
  }

  function fail(res: ServerResponse, err: unknown): void {
    console.error('[auth] route error:', err instanceof Error ? err.message : err);
    if (!res.headersSent) res.writeHead(500).end();
  }

  return (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;

    if (path === '/me') {
      handleMe(req, res).catch((err) => fail(res, err));
      return true;
    }

    if (path.startsWith('/auth/')) {
      // Inert (404) when the account layer is disabled (no DB) — design §2.
      if (!store.enabled) {
        res.writeHead(404).end();
        return true;
      }
      if (path === '/auth/logout') {
        handleLogout(req, res).catch((err) => fail(res, err));
        return true;
      }
      const m = path.match(AUTH_ROUTE);
      if (m) {
        const provider = m[1] as OAuthProviderName;
        const action = m[2];
        const run = action === 'login' ? handleLogin(provider, res) : handleCallback(provider, req, res, url);
        run.catch((err) => fail(res, err));
        return true;
      }
      res.writeHead(404).end();
      return true;
    }

    return false;
  };
}
