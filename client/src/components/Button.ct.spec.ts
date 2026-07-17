import { test, expect } from '@playwright/experimental-ct-svelte';
import Button from './Button.svelte';
import IconButtonHarness from '../test-harness/IconButtonHarness.svelte';

/**
 * T001 (tasks-bottom-bar-icons-47a6.md): Button.svelte gains `icon` +
 * `iconOnly` props so bar controls can render icon-only while staying
 * accessible via aria-label/title, without changing normal (text) button
 * behavior. The `iconOnly` cases mount via IconButtonHarness (not Button
 * directly with an imported icon prop) — importing a lucide-svelte icon
 * module at the top of a `.ct.spec.ts` file fails Playwright's own
 * Node-based test-collection pass (it resolves `.svelte` icon submodules
 * outside Vite), the same reason every other icon-bearing CT spec in this
 * project goes through a `.svelte` test-harness instead.
 */
test('a normal button still renders visible text', async ({ mount, page }) => {
  await mount(Button, { props: { label: 'Settings' } });
  await expect(page.locator('button')).toHaveText('Settings');
});

test('an iconOnly button renders no visible text but exposes the label via aria-label', async ({ mount, page }) => {
  await mount(IconButtonHarness, { props: { label: 'Settings', iconOnly: true } });
  const button = page.locator('button');
  await expect(button).toHaveText('');
  await expect(button).toHaveAttribute('aria-label', 'Settings');
  await expect(button).toHaveAttribute('title', 'Settings');
});
