import { test, expect } from '@playwright/experimental-ct-svelte';
import LandingHarness from './test-harness/LandingHarness.svelte';

// ui.md Account & Sign-In (T002, landing-signin F001): the same AccountMenu
// that renders in the Bar also renders on the Landing chooser — identity +
// Sign out when signed-in, a "Sign in" link when signed-out, and nothing when
// accounts are unavailable. Reuses the existing AccountMenu component.

test('signed-in Landing shows the display name and a Sign out control', async ({ mount }) => {
  const component = await mount(LandingHarness, {
    props: { status: 'signed-in', displayName: 'Ada Lovelace' },
  });

  await expect(component.getByText('Ada Lovelace')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(component.getByText('Sign in')).toHaveCount(0);
});

test('signed-out Landing shows a "Sign in" control', async ({ mount }) => {
  const component = await mount(LandingHarness, {
    props: { status: 'signed-out' },
  });

  await expect(component.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(component.getByText('Sign out')).toHaveCount(0);
});

test('accounts-unavailable Landing renders nothing account-related', async ({ mount }) => {
  const component = await mount(LandingHarness, {
    props: { status: 'unavailable' },
  });

  await expect(component.getByText('Sign in')).toHaveCount(0);
  await expect(component.getByText('Sign out')).toHaveCount(0);
});
