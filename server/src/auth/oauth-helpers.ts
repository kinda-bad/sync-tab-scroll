import * as crypto from 'node:crypto';

/**
 * Provider-agnostic OAuth Authorization-Code hardening primitives (§13 S1;
 * infrastructure.md OAuth flow). The Authorization-Code flow MUST carry a
 * `state`, PKCE, and a `nonce`, all validated on callback — without them the
 * callback is login-CSRF-forgeable. These are pure functions; where the issued
 * values are stashed between `/login` and `/callback` (a signed transaction
 * cookie) is the routes' concern (T008).
 */

export interface AuthorizationParams {
  /** Opaque anti-CSRF token echoed back on the callback and compared constant-time. */
  state: string;
  /** Opaque value bound into the request; compared against the id_token's `nonce` claim. */
  nonce: string;
  /** PKCE code verifier (RFC 7636) — kept server-side, sent to the token endpoint. */
  codeVerifier: string;
  /** PKCE code challenge = BASE64URL(SHA256(verifier)) — sent on the authorize redirect. */
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/** A URL-safe high-entropy token (256 bits). */
function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** PKCE challenge for a verifier: BASE64URL(SHA256(verifier)), the S256 method. */
export function computeCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/** True iff `codeChallenge` is the S256 challenge of `codeVerifier` (constant-time). */
export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
  if (!codeVerifier) return false;
  return constantTimeEqual(computeCodeChallenge(codeVerifier), codeChallenge);
}

/**
 * Constant-time string equality for validating `state`/`nonce` on callback —
 * avoids a timing side-channel and, unlike `crypto.timingSafeEqual` directly,
 * safely returns `false` for a length mismatch (including an empty/missing
 * value) instead of throwing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Freshly generate a full state/PKCE/nonce set for one Authorization-Code request. */
export function createAuthorizationParams(): AuthorizationParams {
  const codeVerifier = randomToken(32);
  return {
    state: randomToken(32),
    nonce: randomToken(32),
    codeVerifier,
    codeChallenge: computeCodeChallenge(codeVerifier),
    codeChallengeMethod: 'S256',
  };
}
