import { test, expect } from '@playwright/experimental-ct-svelte';
import BarHarness from '../test-harness/BarHarness.svelte';

test('the hazard strip is pinned to the top and the nav bar independently pinned to the bottom', async ({ mount, page }) => {
  await mount(BarHarness);

  // Each control's own *positioned wrapper* is what's `position: fixed`,
  // not the control itself — so check the immediate parent's computed
  // style, which is what T015 makes independently top-/bottom-pinned.
  const hazardTop = await page.evaluate(() => {
    const el = document.querySelector('[role="progressbar"]')?.parentElement;
    return el ? getComputedStyle(el).top : null;
  });
  const barBottom = await page.evaluate(() => {
    const el = document.querySelector('.bar')?.parentElement;
    return el ? getComputedStyle(el).bottom : null;
  });

  expect(hazardTop).toBe('0px');
  expect(barBottom).toBe('0px');
});
