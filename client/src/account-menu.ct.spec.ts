import { test, expect } from '@playwright/experimental-ct-svelte';
import AccountMenu from './components/AccountMenu.svelte';
import AccountMenuSignOutHarness from './test-harness/AccountMenuSignOutHarness.svelte';

// ui.md Account & Sign-In (T016): signed-out shows "Sign in"; signed-in shows
// the display name + Sign out; accounts-unavailable ⇒ affordances absent.

test('signed-out shows a "Sign in" affordance', async ({ mount }) => {
  const menu = await mount(AccountMenu, { props: { status: 'signed-out' } });
  await expect(menu.getByText('Sign in')).toBeVisible();
  await expect(menu.getByText('Sign out')).toHaveCount(0);
});

test('signed-in shows the display name and a Sign out action', async ({ mount }) => {
  const menu = await mount(AccountMenu, { props: { status: 'signed-in', displayName: 'Ada Lovelace' } });
  await expect(menu.getByText('Ada Lovelace')).toBeVisible();
  await expect(menu.getByText('Sign out')).toBeVisible();
  await expect(menu.getByText('Sign in')).toHaveCount(0);
});

test('accounts-unavailable renders no affordances at all', async ({ mount }) => {
  const menu = await mount(AccountMenu, { props: { status: 'unavailable' } });
  await expect(menu.getByText('Sign in')).toHaveCount(0);
  await expect(menu.getByText('Sign out')).toHaveCount(0);
});

test('the pre-resolved unknown state also renders nothing', async ({ mount }) => {
  const menu = await mount(AccountMenu, { props: { status: 'unknown' } });
  await expect(menu.getByText('Sign in')).toHaveCount(0);
});

test('clicking Sign out calls onSignOut with NO arguments (does not pass the click event)', async ({ mount }) => {
  // Regression (prod sign-out failure): `onclick={onSignOut}` passed the
  // PointerEvent into signOut's defaulted `fetchFn` param, so the real fetch
  // was never made and logout silently no-op'd. The handler must be invoked
  // with zero args so `fetchFn` keeps its `fetch` default.
  const harness = await mount(AccountMenuSignOutHarness);
  await harness.getByRole('button', { name: 'Sign out' }).click();
  await expect(harness.getByTestId('signout-arg-count')).toHaveText('0');
});

test('signed-out "Sign in" expands to provider choices', async ({ mount }) => {
  const menu = await mount(AccountMenu, { props: { status: 'signed-out' } });
  await menu.getByText('Sign in').click();
  await expect(menu.getByText('Google')).toBeVisible();
  await expect(menu.getByText('GitHub')).toBeVisible();
});

// T011: "My catalogues" entry — visible only for a signed-in owner (ui.md
// In-App Authoring), absent otherwise, same "absent, not disabled" pattern.
test('signed-in owner (ownedCatalogueIds non-empty) shows "My catalogues"', async ({ mount }) => {
  const menu = await mount(AccountMenu, {
    props: { status: 'signed-in', displayName: 'Ada Lovelace', ownedCatalogueIds: ['my-band'] },
  });
  await expect(menu.getByText('My catalogues')).toBeVisible();
});

test('signed-in non-owner (ownedCatalogueIds empty) has no "My catalogues" entry', async ({ mount }) => {
  const menu = await mount(AccountMenu, {
    props: { status: 'signed-in', displayName: 'Ada Lovelace', ownedCatalogueIds: [] },
  });
  await expect(menu.getByText('My catalogues')).toHaveCount(0);
});

test('signed-out never shows "My catalogues" even if ownedCatalogueIds were somehow set', async ({ mount }) => {
  const menu = await mount(AccountMenu, { props: { status: 'signed-out', ownedCatalogueIds: ['my-band'] } });
  await expect(menu.getByText('My catalogues')).toHaveCount(0);
});

test('clicking "My catalogues" calls onOpenAuthoring', async ({ mount }) => {
  const calls: unknown[] = [];
  const menu = await mount(AccountMenu, {
    props: {
      status: 'signed-in',
      displayName: 'Ada Lovelace',
      ownedCatalogueIds: ['my-band'],
      onOpenAuthoring: () => calls.push(1),
    },
  });
  await menu.getByText('My catalogues').click();
  expect(calls.length).toBe(1);
});
