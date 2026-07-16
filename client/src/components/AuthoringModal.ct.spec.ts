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

// ui.md In-App Authoring / T013: "Add song" form (file + consent fields),
// real progress states, inline (not toast) error display.

test('"Add song" is absent when songUploadEnabled is false (T014)', async ({ mount }) => {
  const modal = await mount(AuthoringModal, {
    props: { open: true, ownedCatalogueIds: ['my-band'], songUploadEnabled: false },
  });
  await expect(modal.getByRole('button', { name: 'Add song' })).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Co-owners' })).toBeVisible();
});

test('"Add song" reveals the file/consent form', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: ['my-band'] } });
  await modal.getByRole('button', { name: 'Add song' }).click();
  await expect(modal.getByLabel('Guitar Pro file')).toBeVisible();
  await expect(modal.getByPlaceholder('Artist')).toBeVisible();
  await expect(modal.getByPlaceholder('Title')).toBeVisible();
  await expect(modal.getByPlaceholder('Submitter name')).toBeVisible();
  await expect(modal.getByText('I have the right to distribute this song')).toBeVisible();
});

test('song upload disables the submit button while in flight, then closes the panel on success', async ({ mount, page }) => {
  let resolveRoute!: () => void;
  const routeGate = new Promise<void>((r) => (resolveRoute = r));
  await page.route('**/catalogues/my-band/songs**', async (route) => {
    await routeGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, songId: 'a-b' }) });
  });

  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: ['my-band'] } });
  await modal.getByRole('button', { name: 'Add song' }).click();
  await modal.getByLabel('Guitar Pro file').setInputFiles({ name: 'song.gp', mimeType: 'application/zip', buffer: Buffer.from('x') });
  await modal.getByPlaceholder('Artist').fill('A');
  await modal.getByPlaceholder('Title').fill('B');
  await modal.getByPlaceholder('Submitter name').fill('S');
  await modal.getByLabel('I have the right to distribute this song').check();
  await modal.getByRole('button', { name: 'Upload song' }).click();

  // In flight: the submit button is disabled and a status line is showing
  // (either 'Uploading…' or 'Processing…' — which one is a real timing race
  // between the upload's own 'progress'/'load' events and the route being
  // held open, not something this harness can pin deterministically).
  await expect(modal.getByRole('button', { name: 'Upload song' })).toBeDisabled();
  resolveRoute();
  // The form resets/closes on success — the panel (and its Cancel button) disappears.
  await expect(modal.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Add song' })).toBeVisible();
});

// ui.md In-App Authoring / T018: "Co-owners" section — roster + invite link.

test('"Co-owners" lists current owners and generates an invite link', async ({ mount, page }) => {
  await page.route('**/catalogues/my-band/owners', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ owners: [{ userId: 'u1', displayName: 'Ada' }] }) }),
  );
  await page.route('**/catalogues/my-band/invite', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'tok123' }) }),
  );

  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: ['my-band'] } });
  await modal.getByRole('button', { name: 'Co-owners' }).click();
  await expect(modal.getByText('Ada')).toBeVisible();

  await modal.getByRole('button', { name: 'Generate invite link' }).click();
  await expect(modal.locator('.invite-link')).toHaveValue(/invite=tok123/);
});
