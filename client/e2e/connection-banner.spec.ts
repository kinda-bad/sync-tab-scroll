import { test, expect } from '@playwright/test';
import type { WebSocketRoute } from '@playwright/test';
import { createSessionAsHost } from './helpers';

/**
 * Routes the client's real WS connection through a controllable proxy
 * (Playwright's WebSocket routing, not the shared e2e webServer process —
 * killing that would affect every other e2e test running in parallel
 * against it) so "the server is down" can be simulated per-test without
 * touching the real server on 6081 at all.
 */
async function routeWsConnection(context: import('@playwright/test').BrowserContext) {
  let allowed = true;
  let current: WebSocketRoute | null = null;

  await context.routeWebSocket(/^ws:\/\/localhost:6081/, (route) => {
    current = route;
    if (!allowed) {
      route.close();
      return;
    }
    // No onMessage/onClose handlers registered on either side, so
    // Playwright's default both-directions forwarding applies — this is a
    // transparent proxy to the real server as long as `allowed` is true.
    route.connectToServer();
  });

  return {
    disconnect() {
      allowed = false;
      current?.close();
    },
    reconnect() {
      allowed = true;
    },
  };
}

test('shows a persistent banner while the connection is down, clears once restored, and keeps the session usable without a reload', async ({
  page,
  context,
}) => {
  const ws = await routeWsConnection(context);

  await createSessionAsHost(page, 'Host');
  await expect(page.getByText(/Join code:/)).toBeVisible();
  await expect(page.getByTestId('connection-banner')).toHaveCount(0);

  ws.disconnect();
  await expect(page.getByTestId('connection-banner')).toBeVisible({ timeout: 5_000 });

  ws.reconnect();
  // The client's own retry runs on a fixed 2s interval (ws-client.ts) —
  // no page action needed, recovery is automatic.
  await expect(page.getByTestId('connection-banner')).toHaveCount(0, { timeout: 10_000 });

  // Session state survived the drop (T004's session-join resend reattached
  // this socket to the same participant) — no reload, still the same Lobby.
  await expect(page.getByText(/Join code:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select' }).first()).toBeVisible();
});

test('shows the banner on a fresh page load against a down server (Landing.svelte auto-reconnect-on-load, the original feedback scenario)', async ({
  page,
  context,
}) => {
  // A page load only auto-connects at all if session-persistence.ts has a
  // stored session (Landing.svelte's onMount) — a blank visitor who's never
  // clicked "Create"/"Join" has no socket to retry in the first place. So
  // first establish a real session (server up), then reload against a down
  // server to exercise that specific auto-reconnect-on-load path.
  const ws = await routeWsConnection(context);
  await createSessionAsHost(page, 'Host');
  await expect(page.getByText(/Join code:/)).toBeVisible();

  ws.disconnect();
  await page.reload();

  await expect(page.getByTestId('connection-banner')).toBeVisible({ timeout: 5_000 });

  ws.reconnect();
  await expect(page.getByTestId('connection-banner')).toHaveCount(0, { timeout: 10_000 });
  // Reattached via T004's session-join resend — back in the same Lobby, no manual re-join.
  await expect(page.getByText(/Join code:/)).toBeVisible();
});
