import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import HeadlessPlayerHarness from './test-harness/HeadlessPlayerHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
});

test('reaches ready without ever attaching a visible container', async ({ mount, page }) => {
  // HeadlessPlayerHarness has a single root element (the data-testid="status"
  // div itself) — Playwright CT's mount() locator IS that element directly
  // when a component has one root node, not a wrapper around it, so assert
  // on `component` itself rather than `component.getByTestId(...)` (which
  // searches descendants and would never match).
  const component = await mount(HeadlessPlayerHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });

  await expect(component).toHaveText('ready', { timeout: 20_000 });

  // createHeadlessPlayer appends its own hidden container directly to
  // document.body (not to the mounted component's own root) — confirm it
  // stayed display:none, never became a visible rendered tab.
  const hiddenContainerCount = await page.evaluate(
    () => document.querySelectorAll('body > div[style*="display: none"], body > div[style*="display:none"]').length,
  );
  expect(hiddenContainerCount).toBeGreaterThan(0);
  await expect(component.locator('svg')).toHaveCount(0);
});
