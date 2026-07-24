import { test, expect } from '@playwright/test';
import { createSessionAsHost, joinSessionAsMember, readStoredSession } from './helpers';

async function setUpHostAndMember(page: import('@playwright/test').Page, browser: import('@playwright/test').Browser) {
  await createSessionAsHost(page, 'Host');
  // See host-controls.spec.ts (T023/T024) for why this can't be `.first()`.
  await page.getByRole('listitem').filter({ hasText: 'Synthetic Test Song' }).getByRole('button', { name: 'Select' }).click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // the (only) instrument part — auto-closes the modal
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', hostSession.code);
  await memberPage.getByRole('button', { name: 'Select' }).last().click(); // Lyrics — auto-closes the modal

  return { memberContext, memberPage, hostSession };
}

test('the host can directly delegate host privileges to a connected member', async ({ page, browser }) => {
  const { memberContext, memberPage } = await setUpHostAndMember(page, browser);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Member', { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Make host' }).click();

  // Host-only controls move to the new host and disappear from the old one:
  // the new host (member) now sees "Make host" on the old host's row, and
  // the old host (now a member) sees "Request to become host" on their own.
  await memberPage.getByRole('button', { name: 'Settings' }).click();
  await expect(memberPage.getByRole('button', { name: 'Make host' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Request to become host' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Make host' })).toHaveCount(0);

  await memberContext.close();
});

test('a member can request host and the host grants it by clicking Make host', async ({ page, browser }) => {
  const { memberContext, memberPage } = await setUpHostAndMember(page, browser);

  await memberPage.getByRole('button', { name: 'Settings' }).click();
  await memberPage.getByRole('button', { name: 'Request to become host' }).click();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'Decline' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Make host' }).click();

  // Transfer completes exactly as the direct-delegate case, and the
  // pending request clears (Decline control disappears for the new host too).
  await expect(page.getByRole('button', { name: 'Decline' })).toHaveCount(0, { timeout: 10_000 });
  await expect(memberPage.getByRole('button', { name: 'Make host' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Request to become host' })).toBeVisible({ timeout: 10_000 });

  await memberContext.close();
});

test('the host can decline a request without transferring host privileges', async ({ page, browser }) => {
  const { memberContext, memberPage, hostSession } = await setUpHostAndMember(page, browser);

  await memberPage.getByRole('button', { name: 'Settings' }).click();
  await memberPage.getByRole('button', { name: 'Request to become host' }).click();

  await page.getByRole('button', { name: 'Settings' }).click();
  const declineButton = page.getByRole('button', { name: 'Decline' });
  await expect(declineButton).toBeVisible({ timeout: 10_000 });
  await declineButton.click();

  // Host privileges did not move: the host still sees "Make host" (still
  // host), the pending indicator clears, and the member's request control
  // re-enables (no longer disabled by a pending request).
  await expect(page.getByRole('button', { name: 'Decline' })).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Make host' })).toBeVisible({ timeout: 10_000 });
  const stillHostSession = await readStoredSession(page);
  expect(stillHostSession.participantId).toBe(hostSession.participantId);
  await expect(memberPage.getByRole('button', { name: 'Request to become host' })).toBeEnabled({ timeout: 10_000 });

  await memberContext.close();
});
