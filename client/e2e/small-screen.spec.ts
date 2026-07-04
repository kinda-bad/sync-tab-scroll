import { test, expect, devices } from '@playwright/test';
import {
  createSessionAsHost,
  expectNoHorizontalOverflow,
  readStoredSession,
  sendAsParticipant,
} from './helpers';

/**
 * Phone-width layout invariant (plan-worktree-ui-improvements T001): no
 * view or open modal may require horizontal scrolling on a phone.
 *
 * Mobile emulation (not just a narrow desktop viewport) is required:
 * desktop Chromium ignores <meta name="viewport"> entirely, so a plain
 * 390×844 desktop window would never exercise the meta tag T002 adds —
 * `devices['iPhone 13']` sets isMobile, which is what makes the meta tag
 * (and its absence) observable. Chromium still runs these tests; the
 * device descriptor only supplies context options.
 */
test.use({
  ...devices['iPhone 13'],
  // iPhone 13's descriptor prefers WebKit; this project runs Chromium.
  defaultBrowserType: 'chromium',
});

test('landing chooser and create form fit a phone screen', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await expect(page.getByRole('button', { name: 'Create a session' })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'landing chooser');

  await page.getByRole('button', { name: 'Create a session' }).click();
  await expect(page.getByPlaceholder('Musician')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'landing create form');
});

test('lobby with song/part modal, then settings modal, fits a phone screen', async ({ page }) => {
  await createSessionAsHost(page, 'Host');

  // The song/part modal auto-opens (forced open) until song + part are set.
  await expect(page.getByRole('button', { name: 'Select' }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, 'lobby with song/part modal open');

  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click();
  await expectNoHorizontalOverflow(page, 'lobby, no modal');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'lobby with settings modal open');
});

test('narrow (360px): lobby, member settings modal, error toast fit', async ({ page, browser }) => {
  await createSessionAsHost(page, 'Host');
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click();
  const code = (await page.getByText(/Join code:/).textContent())?.match(/[A-Z2-9]{4}/)?.[0];
  if (!code) throw new Error('no join code visible');

  // A member on a narrower (360px) phone: the participants list now has two
  // rows, and the member's own row carries the longest control in the app
  // ("Request to become host").
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  const member = await context.newPage();
  await member.goto('http://localhost:4173/');
  await member.getByRole('button', { name: 'Join a session' }).click();
  await member.getByPlaceholder('Musician').fill('Member with a long name');
  await member.getByLabel('Session code').fill(code);
  await member.getByRole('button', { name: 'Join' }).click();

  // Song/part modal (part picker) is forced open for the member.
  await expect(member.getByRole('button', { name: 'Select' }).first()).toBeVisible();
  await expectNoHorizontalOverflow(member, '360px member: song/part modal');
  await member.getByRole('button', { name: 'Select' }).first().click(); // pick a part
  await member.getByRole('button', { name: 'Close' }).click();
  await expectNoHorizontalOverflow(member, '360px member: lobby');

  await member.getByRole('button', { name: 'Settings' }).click();
  await expect(member.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expectNoHorizontalOverflow(member, '360px member: settings modal (participant rows)');
  await context.close();

  // Error toast at narrow width: a failed join surfaces a toast.
  const toastCtx = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  const toastPage = await toastCtx.newPage();
  await toastPage.goto('http://localhost:4173/');
  await toastPage.getByRole('button', { name: 'Join a session' }).click();
  await toastPage.getByPlaceholder('Musician').fill('Nobody');
  await toastPage.getByLabel('Session code').fill('XXXX');
  await toastPage.getByRole('button', { name: 'Join' }).click();
  await expect(toastPage.locator('.toast').first()).toBeVisible({ timeout: 5_000 });
  await expectNoHorizontalOverflow(toastPage, '360px: error toast');
  await toastCtx.close();
});

test('playback view fits a phone screen', async ({ page }) => {
  await createSessionAsHost(page, 'Host');
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the song
  await page.getByRole('button', { name: 'Select' }).first().click(); // pick the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click();

  const session = await readStoredSession(page);
  await sendAsParticipant(session, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 15_000 });

  await expectNoHorizontalOverflow(page, 'playback view (instrument part)');
});
