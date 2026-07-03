import { test, expect } from '@playwright/test';

test('a fresh session auto-opens the song/part modal', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Host');
  await page.getByRole('button', { name: 'Create session' }).click();

  await expect(page.getByRole('dialog', { name: 'Song & part' })).toBeVisible({ timeout: 10_000 });
});

test('selecting a song and a part allows the modal to be closed manually', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Host');
  await page.getByRole('button', { name: 'Create session' }).click();

  const modal = page.getByRole('dialog', { name: 'Song & part' });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  await modal.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await modal.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part

  // Still open immediately after selection (it's the user's call to
  // dismiss it, not automatic) — close it explicitly via the × control.
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Close' }).click();
  await expect(modal).not.toBeVisible();
});

test('the nav-bar control reopens the modal afterward', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Host');
  await page.getByRole('button', { name: 'Create session' }).click();

  const modal = page.getByRole('dialog', { name: 'Song & part' });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.getByRole('button', { name: 'Select' }).first().click();
  await modal.getByRole('button', { name: 'Select' }).first().click();
  await modal.getByRole('button', { name: 'Close' }).click();
  await expect(modal).not.toBeVisible();

  await page.getByRole('button', { name: 'Song & part' }).click();
  await expect(modal).toBeVisible();
});
