import { test, expect } from '@playwright/experimental-ct-svelte';
import LandingHarness from './test-harness/LandingHarness.svelte';

// T006 (remember-logged-in-display-nam): the Landing View's create/join
// "Your name" inputs pre-fill from a signed-in user's provider-profile
// display name when no local (session-persistence.ts-stored) value exists
// yet, and do NOT override an existing local/manually-typed value.

test('signed-in user with no stored local session: create-form name pre-fills from the account display name', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, {
    props: { status: 'signed-in', displayName: 'Ada Lovelace' },
  });

  await component.getByRole('button', { name: 'Create a session' }).click();

  await expect(component.getByLabel('Your name')).toHaveValue('Ada Lovelace');
});

test('signed-in user with no stored local session: join-form name pre-fills from the account display name', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, {
    props: { status: 'signed-in', displayName: 'Ada Lovelace' },
  });

  await component.getByRole('button', { name: 'Join a session' }).click();

  await expect(component.getByLabel('Your name')).toHaveValue('Ada Lovelace');
});

test('does not override a name the user already typed manually', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, {
    props: { status: 'signed-out', displayName: null },
  });

  await component.getByRole('button', { name: 'Create a session' }).click();
  await component.getByLabel('Your name').fill('Manually Typed');

  // Account resolves signed-in AFTER the user already typed a name.
  await component.update({ props: { status: 'signed-in', displayName: 'Ada Lovelace' } });

  await expect(component.getByLabel('Your name')).toHaveValue('Manually Typed');
});
