import { test, expect } from '@playwright/test';
import { createSessionAsHost, readStoredSession, sendAsParticipant } from './helpers';

test('a fresh session auto-opens the song/part modal', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  await expect(page.getByRole('dialog', { name: 'Song & part' })).toBeVisible({ timeout: 10_000 });
});

// ui.md Lobby View (T003, bar-controls F001): the auto-opened song/part modal
// is dismissible even while song/part is still unset, so the persistent Bar
// (Leave session, Sign out) is never permanently trapped behind its backdrop.
// Once dismissed it stays closed until reopened via the "Song & part" control.

test('the song/part modal is dismissible via × while still unset, leaving the Bar reachable', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  const modal = page.getByRole('dialog', { name: 'Song & part' });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  // Dismiss via the × even though no song/part is selected yet.
  await modal.getByRole('button', { name: 'Close' }).click();
  await expect(modal).not.toBeVisible();

  // It stays closed while still unset — it does not immediately re-open.
  await page.waitForTimeout(500);
  await expect(modal).not.toBeVisible();

  // The persistent Bar is reachable: its "Leave session" control is clickable.
  await expect(page.getByRole('button', { name: 'Leave session' })).toBeEnabled();

  // Reopens via the "Song & part" nav control.
  await page.getByRole('button', { name: 'Song & part' }).click();
  await expect(modal).toBeVisible();
});

test('the song/part modal is dismissible via a backdrop click while still unset', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  const modal = page.getByRole('dialog', { name: 'Song & part' });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  // Click the backdrop (top-left corner, outside the centered panel).
  await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(modal).not.toBeVisible();

  // Stays closed while still unset.
  await page.waitForTimeout(500);
  await expect(modal).not.toBeVisible();
});

test('selecting a part auto-closes the modal', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  const modal = page.getByRole('dialog', { name: 'Song & part' });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  await modal.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await modal.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part

  await expect(modal).not.toBeVisible();
});

test('the nav-bar control reopens the modal afterward, and it can still be dismissed manually', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  const modal = page.getByRole('dialog', { name: 'Song & part' });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.getByRole('button', { name: 'Select' }).first().click();
  await modal.getByRole('button', { name: 'Select' }).first().click(); // auto-closes the modal
  await expect(modal).not.toBeVisible();

  await page.getByRole('button', { name: 'Song & part' }).click();
  await expect(modal).toBeVisible();

  // Reopening doesn't re-trigger a part selection, so it stays open until
  // manually dismissed — auto-close only fires from an actual pick.
  await modal.getByRole('button', { name: 'Close' }).click();
  await expect(modal).not.toBeVisible();
});

/**
 * Regression test: "Change song" used to call selectSong(session.selectedSong)
 * — re-selecting the already-selected song, a documented no-op on
 * song-select.ts's own re-selection guard — so it never actually showed the
 * catalog list back. It only ever looked like it worked in the sense that
 * nothing crashed; the list simply never appeared.
 */
test('"Change song" shows the catalog list again, not a no-op', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  const modal = page.getByRole('dialog', { name: 'Song & part' });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.getByRole('button', { name: 'Select' }).first().click(); // pick the song

  // Now showing the "song selected" summary, not the catalog list.
  await expect(modal.getByText('Catalog')).not.toBeVisible();
  await expect(modal.getByRole('button', { name: 'Change song' })).toBeVisible();

  await modal.getByRole('button', { name: 'Change song' }).click();

  // The catalog list is back, with a real Select control to pick again —
  // this is the part that was silently broken.
  await expect(modal.getByText('Catalog')).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Select' }).first()).toBeVisible();
});

test('the Playback view shows which part is currently selected', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part — auto-closes the modal

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.getByTestId('current-part')).toHaveText('Playing: Guitar');
});
