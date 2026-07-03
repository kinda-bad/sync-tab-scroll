import { test, expect } from '@playwright/experimental-ct-svelte';
import ThemeHarness from './test-harness/ThemeHarness.svelte';

test('applyTheme sets document.documentElement.dataset.theme', async ({ mount, page }) => {
  await mount(ThemeHarness);

  await page.evaluate(() => {
    (window as unknown as { __theme: { applyTheme: (t: 'dark' | 'light') => void } }).__theme.applyTheme('light');
  });

  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe('light');
});

test('persistTheme followed by loadStoredTheme round-trips the value', async ({ mount, page }) => {
  await mount(ThemeHarness);

  const loaded = await page.evaluate(() => {
    const { persistTheme, loadStoredTheme } = (
      window as unknown as {
        __theme: { persistTheme: (t: 'dark' | 'light') => void; loadStoredTheme: () => string | undefined };
      }
    ).__theme;
    persistTheme('light');
    return loadStoredTheme();
  });

  expect(loaded).toBe('light');
});

test('loadStoredTheme returns undefined when nothing is stored', async ({ mount, page }) => {
  await mount(ThemeHarness);

  const loaded = await page.evaluate(() => {
    return (window as unknown as { __theme: { loadStoredTheme: () => string | undefined } }).__theme.loadStoredTheme();
  });

  expect(loaded).toBeUndefined();
});
