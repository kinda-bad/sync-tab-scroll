import { test, expect } from '@playwright/experimental-ct-svelte';
import AuthoringModal from './AuthoringModal.svelte';

// ui.md In-App Authoring / T012: catalogue list + "Create catalogue" form,
// a standalone modal (not a SettingsModal tab).

test('lists owned catalogues by id', async ({ mount }) => {
  const modal = await mount(AuthoringModal, {
    props: { open: true, ownedCatalogueIds: ['my-band', 'other-band'] },
  });
  await expect(modal.getByText('my-band')).toBeVisible();
  await expect(modal.getByText('other-band')).toBeVisible();
});

test('shows an empty-state when the owner has no catalogues yet', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: [] } });
  await expect(modal.getByText(/no catalogues yet/i)).toBeVisible();
});

test('"Create catalogue" reveals the name/visibility/key form', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: [] } });
  await modal.getByText('Create catalogue').click();
  await expect(modal.getByPlaceholder('Slug (e.g. my-band)')).toBeVisible();
  await expect(modal.getByPlaceholder('Display name')).toBeVisible();
});

test('the key field only appears when Private is selected', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: [] } });
  await modal.getByText('Create catalogue').click();
  await expect(modal.getByPlaceholder('Activation key')).toHaveCount(0);
  await modal.getByLabel('Private').check();
  await expect(modal.getByPlaceholder('Activation key')).toBeVisible();
});

test('submitting the create-catalogue form POSTs /catalogues and calls onCreated on success', async ({ mount, page }) => {
  let seenMethod: string | undefined;
  let seenBody: string | undefined;
  await page.route('**/catalogues', (route) => {
    seenMethod = route.request().method();
    seenBody = route.request().postData() ?? undefined;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, catalogueId: 'my-band' }) });
  });

  const created: string[] = [];
  const modal = await mount(AuthoringModal, {
    props: { open: true, ownedCatalogueIds: [], onCatalogueCreated: (id: string) => created.push(id) },
  });
  await modal.getByText('Create catalogue').click();
  await modal.getByPlaceholder('Slug (e.g. my-band)').fill('my-band');
  await modal.getByPlaceholder('Display name').fill('My Band');
  await modal.getByRole('button', { name: 'Save catalogue' }).click();

  await expect.poll(() => created).toEqual(['my-band']);
  expect(seenMethod).toBe('POST');
  expect(seenBody).toContain('my-band');
});

test('a create-catalogue failure shows an inline error, not a toast', async ({ mount, page }) => {
  await page.route('**/catalogues', (route) =>
    route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'catalogue "my-band" already exists' }) }),
  );

  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: [] } });
  await modal.getByText('Create catalogue').click();
  await modal.getByPlaceholder('Slug (e.g. my-band)').fill('my-band');
  await modal.getByPlaceholder('Display name').fill('My Band');
  await modal.getByRole('button', { name: 'Save catalogue' }).click();

  await expect(modal.getByText(/already exists/)).toBeVisible();
});
