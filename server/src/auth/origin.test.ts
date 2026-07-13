import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from './origin.js';

/**
 * WS-upgrade Origin allowlist (§13 S3) — cookies ride the WS handshake
 * cross-site, so `SameSite=Lax` is not the sole CSRF defense. The allowlist is
 * derived from the app's public origin plus localhost (dev/e2e); a missing
 * Origin (non-browser clients) is allowed since only browsers enforce Origin.
 */
describe('isOriginAllowed (T010)', () => {
  const PUBLIC = 'https://sync-tab-scroll.up.railway.app';

  it('allows the exact public origin', () => {
    expect(isOriginAllowed('https://sync-tab-scroll.up.railway.app', PUBLIC)).toBe(true);
  });

  it('allows localhost / 127.0.0.1 origins on any port or scheme (dev, e2e, preview)', () => {
    expect(isOriginAllowed('http://localhost:6000', PUBLIC)).toBe(true);
    expect(isOriginAllowed('http://localhost:6001', PUBLIC)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:6080', PUBLIC)).toBe(true);
  });

  it('allows a missing Origin (non-browser clients omit it; only browsers enforce it)', () => {
    expect(isOriginAllowed(undefined, PUBLIC)).toBe(true);
    expect(isOriginAllowed('', PUBLIC)).toBe(true);
  });

  it('rejects a foreign origin (the CSRF case)', () => {
    expect(isOriginAllowed('https://evil.example', PUBLIC)).toBe(false);
    expect(isOriginAllowed('https://sync-tab-scroll.up.railway.app.evil.example', PUBLIC)).toBe(false);
  });

  it('rejects a malformed Origin value', () => {
    expect(isOriginAllowed('not-a-url', PUBLIC)).toBe(false);
  });
});
