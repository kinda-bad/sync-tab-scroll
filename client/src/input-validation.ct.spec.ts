import { test, expect } from '@playwright/experimental-ct-svelte';
import LandingHarness from './test-harness/LandingHarness.svelte';
import SongPartModalHarness from './test-harness/SongPartModalHarness.svelte';
import AuthoringModal from './components/AuthoringModal.svelte';
import type { Session } from '@sync-tab-scroll/shared';

function hostSession(): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0, userId: null },
    ],
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
  };
}

// T004: non-authoritative client-side validation mirroring input-validation.ts's
// server-side reject rules (64-char displayName / 256-char activation-key caps,
// no control/HTML special characters) — UX only, never a substitute for the
// server-side reject (Phase 1).

test('Landing "Your name" input shows inline feedback for a control/HTML-char value', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, { props: { status: 'signed-out', displayName: null } });

  await component.getByRole('button', { name: 'Create a session' }).click();
  await component.getByLabel('Your name').fill('<script>Alice</script>');
  await component.getByLabel('Your name').blur();

  await expect(component.getByText(/invalid/i)).toBeVisible();
});

test('Landing "Your name" input shows inline feedback for input over the 64-char cap', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, { props: { status: 'signed-out', displayName: null } });

  await component.getByRole('button', { name: 'Create a session' }).click();
  await component.getByLabel('Your name').fill('a'.repeat(65));
  await component.getByLabel('Your name').blur();

  await expect(component.getByText(/invalid/i)).toBeVisible();
});

test('Landing "Your name" input shows no inline feedback for a valid value', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, { props: { status: 'signed-out', displayName: null } });

  await component.getByRole('button', { name: 'Create a session' }).click();
  await component.getByLabel('Your name').fill('Alice');
  await component.getByLabel('Your name').blur();

  await expect(component.getByText(/invalid/i)).not.toBeVisible();
});

// T006: join-code field format audit — grounded in SessionStore's actual
// 4-char generated alphabet (A-Z minus I/O, 2-9 minus 0/1).
test('Landing "Session code" input shows inline feedback for a code outside the generated format', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, { props: { status: 'signed-out', displayName: null } });

  await component.getByRole('button', { name: 'Join a session' }).click();
  await component.getByLabel('Session code').fill('AB1O');
  await component.getByLabel('Session code').blur();

  await expect(component.getByText(/invalid/i)).toBeVisible();
});

test('Landing "Session code" input shows no inline feedback for a well-formed code', async ({ mount, page }) => {
  await page.addInitScript(() => localStorage.removeItem('sync-tab-scroll:session'));
  const component = await mount(LandingHarness, { props: { status: 'signed-out', displayName: null } });

  await component.getByRole('button', { name: 'Join a session' }).click();
  await component.getByLabel('Session code').fill('AB2X');
  await component.getByLabel('Session code').blur();

  await expect(component.getByText(/invalid/i)).not.toBeVisible();
});

test('Activation key input shows inline feedback for a control/HTML-char value', async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: hostSession(), selfParticipantId: 'host-1', catalog: [], catalogues: [{ id: 'default', name: 'default', public: true }] },
  });

  await component.getByRole('button', { name: 'Enter activation key' }).click();
  await component.getByLabel('Activation key').fill('<b>key</b>');
  await component.getByLabel('Activation key').blur();

  await expect(component.getByText(/invalid/i)).toBeVisible();
});

// T009: create-catalogue form (slug/name/key) inline feedback, mirroring
// T004's pattern.
test('AuthoringModal create-catalogue form shows inline feedback for an invalid slug', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: [] } });
  await modal.getByText('Create catalogue').click();

  await modal.getByPlaceholder('Slug (e.g. my-band)').fill('<script>');
  await modal.getByPlaceholder('Slug (e.g. my-band)').blur();

  await expect(modal.getByText(/invalid/i)).toBeVisible();
});

test('AuthoringModal create-catalogue form shows inline feedback for an invalid name', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: [] } });
  await modal.getByText('Create catalogue').click();

  await modal.getByPlaceholder('Display name').fill('<b>My Band</b>');
  await modal.getByPlaceholder('Display name').blur();

  await expect(modal.getByText(/invalid/i)).toBeVisible();
});

test('AuthoringModal create-catalogue form shows inline feedback for an invalid activation key', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: [] } });
  await modal.getByText('Create catalogue').click();
  await modal.getByLabel('Private').check();

  await modal.getByPlaceholder('Activation key').fill('<b>key</b>');
  await modal.getByPlaceholder('Activation key').blur();

  await expect(modal.getByText(/invalid/i)).toBeVisible();
});

// T011: add-song form (artist/title/submitterName) inline feedback,
// mirroring T004's pattern.
test('AuthoringModal add-song form shows inline feedback for an invalid artist', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: ['my-band'] } });
  await modal.getByRole('button', { name: 'Add song' }).click();

  await modal.getByPlaceholder('Artist').fill('<script>');
  await modal.getByPlaceholder('Artist').blur();

  await expect(modal.getByText(/invalid/i)).toBeVisible();
});

test('AuthoringModal add-song form shows inline feedback for an invalid title', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: ['my-band'] } });
  await modal.getByRole('button', { name: 'Add song' }).click();

  await modal.getByPlaceholder('Title').fill('<b>Title</b>');
  await modal.getByPlaceholder('Title').blur();

  await expect(modal.getByText(/invalid/i)).toBeVisible();
});

test('AuthoringModal add-song form shows inline feedback for an invalid submitterName', async ({ mount }) => {
  const modal = await mount(AuthoringModal, { props: { open: true, ownedCatalogueIds: ['my-band'] } });
  await modal.getByRole('button', { name: 'Add song' }).click();

  await modal.getByPlaceholder('Submitter name').fill('<i>S</i>');
  await modal.getByPlaceholder('Submitter name').blur();

  await expect(modal.getByText(/invalid/i)).toBeVisible();
});
