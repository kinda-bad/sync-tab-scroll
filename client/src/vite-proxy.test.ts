import { describe, expect, it } from 'vitest';
import { accountDevProxy } from './dev-proxy.js';

/**
 * The OAuth redirect dance must be same-origin in dev (design §6 dev-mode
 * wrinkle): the page is served by Vite, so `/auth/*` and `/me` have to proxy to
 * the backend just like `/catalog` already does — otherwise the consent-screen
 * round-trip and the session cookie land on the wrong origin. This tests the
 * proxy map `vite.config.ts` actually uses for both `server` and `preview`.
 */
describe('vite dev proxy routes account paths to the backend (T009)', () => {
  it('forwards /catalog, /auth, and /me to the backend port', () => {
    const proxy = accountDevProxy('6080');
    for (const prefix of ['/catalog', '/auth', '/me']) {
      expect(proxy).toHaveProperty(prefix);
      expect(proxy[prefix]).toBe('http://localhost:6080');
    }
  });

  it('points every account path at whatever backend port is passed', () => {
    expect(accountDevProxy('6081')['/auth']).toBe('http://localhost:6081');
  });
});
