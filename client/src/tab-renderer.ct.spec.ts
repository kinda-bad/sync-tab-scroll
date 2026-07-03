import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import TabRendererHarness from './test-harness/TabRendererHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
});

test('renders real SVG output once the score loads', async ({ mount }) => {
  const component = await mount(TabRendererHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });

  await expect(component.locator('svg').first()).toBeVisible({ timeout: 20_000 });
});

test('setTheme visibly changes rendered resource colors', async ({ mount, page }) => {
  const component = await mount(TabRendererHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0, theme: 'dark' } });
  await expect(component.locator('svg').first()).toBeVisible({ timeout: 20_000 });

  const darkFill = await component.locator('svg text').first().evaluate((el) => getComputedStyle(el).fill);

  await page.evaluate(() => (window as unknown as { __setTheme: (t: string) => void }).__setTheme('light'));

  await expect.poll(async () => component.locator('svg text').first().evaluate((el) => getComputedStyle(el).fill)).not.toBe(darkFill);
});
