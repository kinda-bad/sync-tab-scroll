import { test, expect } from '@playwright/test';
import { createSessionAsHost, readStoredSession, sendAsParticipant } from './helpers';

/**
 * SCOPE NOTE: reaching `readiness: 'ready'` naturally requires alphaTab's
 * `soundFontLoaded` event, which never fires under browser automation
 * (Chrome's autoplay policy blocks the audio decode it depends on —
 * confirmed empirically, a pre-existing project-wide limitation, not
 * specific to this test). `sendAsParticipant` drives the real
 * `readiness-update` WS message directly instead of waiting on the
 * audio-blocked auto-trigger, so Start/Playback-view flows can still be
 * exercised end-to-end.
 */
test('instrument part: Lobby → Playback shows a rendered tab canvas', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  // Join code stays visible in the persistent Bar before song selection too
  // (plan-playback-sync-fixes: the identity() snippet used to replace it
  // entirely once a song/part was picked).
  await expect(page.getByText(/Join code:/)).toBeVisible();

  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click(); // song/part modal stays open until dismissed

  // Still visible after song and part selection.
  await expect(page.getByText(/Join code:/)).toBeVisible();

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.locator('svg').first()).toBeVisible({ timeout: 15_000 });
});

test('lyrics part: Lobby → Playback shows the full-lyrics view, not a tab canvas', async ({ page }) => {
  await createSessionAsHost(page, 'Host');
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).last().click(); // Lyrics is the last row in Lobby.svelte's part list
  await page.getByRole('button', { name: 'Close' }).click(); // song/part modal stays open until dismissed

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  await page.waitForTimeout(1000);
  await expect(page.locator('svg')).toHaveCount(0);
});

test('Start closes the settings modal (plan-settings-modal-redesign T012)', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click(); // song/part modal stays open until dismissed

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  // Open the settings modal before starting.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  // The modal's backdrop (z-index 200) visually sits above the nav bar
  // (z-index 100) while open — a pre-existing overlap unrelated to this
  // test. A real `.click()` (even `force: true`) hit-tests at the
  // button's coordinates and would actually land on the backdrop
  // instead, dismissing the modal via its own onClose without ever
  // running startPlayback() — a false pass that wouldn't actually
  // exercise T013's fix. dispatchEvent bypasses hit-testing and fires
  // the click directly at the Start button's own listener.
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('click');

  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
});
