import { test, expect } from '@playwright/test';
import { createSessionAsHost, readStoredSession, sendAsParticipant } from './helpers';

/**
 * SCOPE NOTE: these tests use `sendAsParticipant` to drive the real
 * `readiness-update` WS message directly rather than waiting on the real
 * `soundFontLoaded` auto-trigger — kept for speed/determinism, not because
 * it's required. It used to be required, under a since-corrected belief
 * that Chrome's autoplay policy blocks the audio decode `soundFontLoaded`
 * depends on under browser automation; the real cause (confirmed
 * 2026-07-04, feedback-lyrics-only-view-d7d8, see helpers.ts's
 * `sendAsParticipant` doc comment) was an unrelated missing build asset,
 * now fixed — real readiness resolves under Playwright too (see
 * `lyrics-only-view.spec.ts`, which uses no bypass).
 */
test('instrument part: Lobby → Playback shows a rendered tab canvas', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  // Join code stays visible in the persistent Bar before song selection too
  // (plan-playback-sync-fixes: the identity() snippet used to replace it
  // entirely once a song/part was picked).
  await expect(page.getByText(/Join code:/)).toBeVisible();

  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part — auto-closes the modal

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
  await page.getByRole('button', { name: 'Select' }).last().click(); // Lyrics is the last row in Lobby.svelte's part list — auto-closes the modal

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  await page.waitForTimeout(1000);
  // Scoped to the tab canvas specifically, not the whole page — the bar's
  // icon-only controls (Cog, Play/Pause/Square, LogOut, MicVocal) render as
  // inline <svg> too (tasks-bottom-bar-icons-47a6.md), so a page-wide `svg`
  // count is no longer 0 even when no tab is rendered.
  await expect(page.locator('.tab-container svg')).toHaveCount(0);
});

test('Start closes the settings modal (plan-settings-modal-redesign T012)', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part — auto-closes the modal

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
