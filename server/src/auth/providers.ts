import type { OAuthProvider as OAuthProviderName } from '@sync-tab-scroll/shared';
import type { AccountConfig, OAuthClientConfig } from '../config.js';
import { constantTimeEqual } from './oauth-helpers.js';

export type { OAuthProviderName };

/** The profile fields Phase 1 needs from a provider (design §3 — token used once, then discarded). */
export interface OAuthProfile {
  provider: OAuthProviderName;
  /** The provider's stable subject (`sub`) id → `User.oauthSubject`. */
  subject: string;
  displayName: string;
  email: string | null;
}

export interface BuildAuthorizeUrlOptions {
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  redirectUri: string;
}

export interface ExchangeOptions {
  code: string;
  codeVerifier: string;
  /** The nonce issued at login — validated against the id_token where the provider is OIDC (Google). */
  nonce: string;
  redirectUri: string;
}

/**
 * Provider-agnostic OAuth client seam. The real Google/GitHub impls call the
 * provider over HTTPS; tests inject a mock. `exchangeCodeForProfile` uses the
 * provider access token exactly once to fetch the profile and then discards it —
 * no token is ever stored (design §3).
 */
export interface OAuthProvider {
  buildAuthorizeUrl(opts: BuildAuthorizeUrlOptions): string;
  exchangeCodeForProfile(opts: ExchangeOptions): Promise<OAuthProfile>;
}

export type OAuthProviderRegistry = Record<OAuthProviderName, OAuthProvider>;

/** Base64url-decodes and JSON-parses a JWT payload segment (no signature check — see note in {@link GoogleProvider}). */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const seg = jwt.split('.')[1] ?? '';
  return JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'));
}

class GoogleProvider implements OAuthProvider {
  constructor(private readonly client: OAuthClientConfig) {}

  buildAuthorizeUrl(o: BuildAuthorizeUrlOptions): string {
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', this.client.clientId);
    u.searchParams.set('redirect_uri', o.redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'openid email profile');
    u.searchParams.set('state', o.state);
    u.searchParams.set('nonce', o.nonce);
    u.searchParams.set('code_challenge', o.codeChallenge);
    u.searchParams.set('code_challenge_method', o.codeChallengeMethod);
    return u.toString();
  }

  async exchangeCodeForProfile(o: ExchangeOptions): Promise<OAuthProfile> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: o.code,
        client_id: this.client.clientId,
        client_secret: this.client.clientSecret,
        redirect_uri: o.redirectUri,
        code_verifier: o.codeVerifier,
      }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
    const token = (await res.json()) as { id_token?: string };
    if (!token.id_token) throw new Error('Google token response missing id_token');

    // The id_token is fetched here directly from Google's token endpoint over
    // TLS (not relayed through the browser), so the code-flow transport is the
    // trust anchor; we still validate the `nonce` claim (§13 S1). Full JWKS
    // signature verification is a hardening follow-up (infrastructure.md
    // Production Annotations — this surface must be kept current with best
    // practice), not required for the single-issuer, direct-fetch case.
    const claims = decodeJwtPayload(token.id_token);
    if (typeof claims.nonce !== 'string' || !constantTimeEqual(claims.nonce, o.nonce)) {
      throw new Error('Google id_token nonce mismatch');
    }
    return {
      provider: 'google',
      subject: String(claims.sub),
      displayName: typeof claims.name === 'string' ? claims.name : String(claims.email ?? 'Google user'),
      email: typeof claims.email === 'string' ? claims.email : null,
    };
  }
}

class GitHubProvider implements OAuthProvider {
  constructor(private readonly client: OAuthClientConfig) {}

  buildAuthorizeUrl(o: BuildAuthorizeUrlOptions): string {
    // GitHub is not OIDC (no id_token/nonce), but still carries state + PKCE.
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', this.client.clientId);
    u.searchParams.set('redirect_uri', o.redirectUri);
    u.searchParams.set('scope', 'read:user user:email');
    u.searchParams.set('state', o.state);
    u.searchParams.set('code_challenge', o.codeChallenge);
    u.searchParams.set('code_challenge_method', o.codeChallengeMethod);
    return u.toString();
  }

  async exchangeCodeForProfile(o: ExchangeOptions): Promise<OAuthProfile> {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        code: o.code,
        client_id: this.client.clientId,
        client_secret: this.client.clientSecret,
        redirect_uri: o.redirectUri,
        code_verifier: o.codeVerifier,
      }),
    });
    if (!tokenRes.ok) throw new Error(`GitHub token exchange failed: ${tokenRes.status}`);
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) throw new Error('GitHub token response missing access_token');

    const authHeader = { authorization: `Bearer ${token.access_token}`, accept: 'application/vnd.github+json', 'user-agent': 'sync-tab-scroll' };
    const userRes = await fetch('https://api.github.com/user', { headers: authHeader });
    if (!userRes.ok) throw new Error(`GitHub user fetch failed: ${userRes.status}`);
    const user = (await userRes.json()) as { id: number; login: string; name: string | null; email: string | null };

    let email = user.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', { headers: authHeader });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[];
        email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email ?? null;
      }
    }
    return {
      provider: 'github',
      subject: String(user.id),
      displayName: user.name ?? user.login,
      email: email ?? null,
    };
  }
}

/** Builds the live Google + GitHub provider registry from account config. */
export function createProviderRegistry(config: Pick<AccountConfig, 'google' | 'github'>): OAuthProviderRegistry {
  return {
    google: new GoogleProvider(config.google),
    github: new GitHubProvider(config.github),
  };
}
