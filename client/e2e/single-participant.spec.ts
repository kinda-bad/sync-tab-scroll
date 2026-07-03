import { test, expect } from '@playwright/test';
import { readStoredSession, sendAsParticipant } from './helpers';

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
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Host');
  await page.getByRole('button', { name: 'Create session' }).click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.locator('svg').first()).toBeVisible({ timeout: 15_000 });
});

test('lyrics part: Lobby → Playback shows the full-lyrics view, not a tab canvas', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Host');
  await page.getByRole('button', { name: 'Create session' }).click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).last().click(); // Lyrics is the last row in Lobby.svelte's part list

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  await page.waitForTimeout(1000);
  await expect(page.locator('svg')).toHaveCount(0);
});
