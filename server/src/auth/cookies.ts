import * as crypto from 'node:crypto';

/**
 * Minimal cookie plumbing for the hand-rolled OAuth flow (infrastructure.md
 * User Accounts). Two cookies exist:
 * - `sts_session` — carries ONLY the opaque `AuthSession.id` (§13 S2; validated
 *   by a DB lookup, so it is not signed — the entropy + server-side revocation
 *   are the security, not a signature).
 * - `sts_auth_tx` — the short-lived OAuth transaction (state/nonce/verifier)
 *   carried between `/login` and `/callback`; this IS signed with the
 *   session-cookie secret so a client can't forge it (§13 S1).
 */

export const SESSION_COOKIE = 'sts_session';
export const AUTH_TX_COOKIE = 'sts_auth_tx';

/** Parses a `Cookie:` header into a name→value map (values URL-decoded). */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
  maxAgeSeconds?: number;
}

/** Serializes a `Set-Cookie` value with the given attributes. */
export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? '/'}`);
  if (opts.maxAgeSeconds !== undefined) parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}

/** A cleared cookie (`Max-Age=0`) for logout. */
export function clearCookie(name: string, opts: CookieOptions = {}): string {
  return serializeCookie(name, '', { ...opts, maxAgeSeconds: 0 });
}

/** HMAC-signs a value as `${base64url(value)}.${hmac}` so it can't be forged/tampered. */
export function signValue(value: string, secret: string): string {
  const payload = Buffer.from(value, 'utf8').toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

/** Verifies and decodes a value produced by {@link signValue}; null if tampered/malformed. */
export function verifySignedValue(signed: string, secret: string): string | null {
  const dot = signed.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = signed.slice(0, dot);
  const mac = signed.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expected);
  if (macBuf.length !== expBuf.length || !crypto.timingSafeEqual(macBuf, expBuf)) return null;
  return Buffer.from(payload, 'base64url').toString('utf8');
}
