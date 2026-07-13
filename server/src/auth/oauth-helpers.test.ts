import { describe, expect, it } from 'vitest';
import {
  computeCodeChallenge,
  constantTimeEqual,
  createAuthorizationParams,
  verifyCodeChallenge,
} from './oauth-helpers.js';

/**
 * OAuth Authorization-Code hardening primitives (§13 S1): `state`, PKCE
 * (verifier/challenge, S256), and `nonce`, all validated on callback. Without
 * them the callback is login-CSRF-forgeable.
 */
describe('oauth Authorization-Code helpers (T007)', () => {
  it('generates a well-formed state/PKCE/nonce set that round-trips', () => {
    const p = createAuthorizationParams();
    expect(p.state.length).toBeGreaterThan(20);
    expect(p.nonce.length).toBeGreaterThan(20);
    expect(p.codeVerifier.length).toBeGreaterThan(42); // RFC 7636: 43–128 chars
    expect(p.codeChallengeMethod).toBe('S256');
    // The published challenge is the S256 of the verifier we hold.
    expect(p.codeChallenge).toBe(computeCodeChallenge(p.codeVerifier));
    expect(verifyCodeChallenge(p.codeVerifier, p.codeChallenge)).toBe(true);
  });

  it('produces unique params each call (no fixed/guessable values)', () => {
    const a = createAuthorizationParams();
    const b = createAuthorizationParams();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });

  it('rejects a tampered PKCE verifier (wrong verifier ⇒ challenge mismatch)', () => {
    const p = createAuthorizationParams();
    expect(verifyCodeChallenge(p.codeVerifier + 'x', p.codeChallenge)).toBe(false);
    expect(verifyCodeChallenge('', p.codeChallenge)).toBe(false);
  });

  it('constant-time compare validates a matching state/nonce and rejects a tampered or missing one', () => {
    const p = createAuthorizationParams();
    expect(constantTimeEqual(p.state, p.state)).toBe(true);
    expect(constantTimeEqual(p.nonce, p.nonce)).toBe(true);
    expect(constantTimeEqual(p.state, p.state + 'x')).toBe(false);
    expect(constantTimeEqual(p.state, '')).toBe(false);
    expect(constantTimeEqual('', p.state)).toBe(false);
  });
});
