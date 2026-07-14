import { test, expect } from '@playwright/experimental-ct-svelte';
import ConnectionBannerHarness from '../test-harness/ConnectionBannerHarness.svelte';

test('is hidden while connected', async ({ mount }) => {
  const component = await mount(ConnectionBannerHarness, { props: { status: 'connected' } });
  await expect(component.getByTestId('connection-banner')).toHaveCount(0);
});

test('is visible while connecting', async ({ mount }) => {
  const component = await mount(ConnectionBannerHarness, { props: { status: 'connecting' } });
  await expect(component.getByTestId('connection-banner')).toBeVisible();
});

test('is visible while disconnected', async ({ mount }) => {
  const component = await mount(ConnectionBannerHarness, { props: { status: 'disconnected' } });
  await expect(component.getByTestId('connection-banner')).toBeVisible();
});

test('is hidden on Landing (no WsClient) even while the default status is connecting', async ({ mount }) => {
  // Regression: `connectionStatus` defaults to 'connecting', and the banner
  // renders unconditionally in App.svelte — so on Landing, where connect() has
  // never run and there is no WsClient, the banner falsely claimed a lost
  // connection. It must stay hidden until a WsClient actually exists.
  const component = await mount(ConnectionBannerHarness, { props: { status: 'connecting', hasWsClient: false } });
  await expect(component.getByTestId('connection-banner')).toHaveCount(0);
});

test('is pinned to the top of the viewport, above alphaTab cursors and the lyrics overlay', async ({ mount, page }) => {
  const component = await mount(ConnectionBannerHarness, { props: { status: 'disconnected' } });
  await expect(component.getByTestId('connection-banner')).toBeVisible();

  const style = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="connection-banner"]');
    return el ? getComputedStyle(el) : null;
  });
  expect(style?.position).toBe('fixed');
  expect(style?.top).toBe('0px');
  expect(Number(style?.zIndex)).toBeGreaterThan(1001);
});
