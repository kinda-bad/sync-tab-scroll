import { test, expect } from '@playwright/experimental-ct-svelte';
import Tooltip from './Tooltip.svelte';

/**
 * T001 (tasks-hover-long-press-tooltip-for-i-9124.md): standalone Tooltip
 * component — a small popover showing `label` text, gated by `visible`.
 * Written and confirmed failing before Tooltip.svelte existed
 * (constitution Principle VII).
 */
test('with visible=false the label text is not present', async ({ mount }) => {
  const component = await mount(Tooltip, { props: { label: 'Settings', visible: false } });
  await expect(component.getByText('Settings')).not.toBeVisible();
});

test('with visible=true the label text is visible', async ({ mount }) => {
  const component = await mount(Tooltip, { props: { label: 'Settings', visible: true } });
  await expect(component.getByText('Settings')).toBeVisible();
});
