import { test, expect, type Browser } from '@playwright/test';
import { readStoredSession, sendAsParticipant } from './helpers';

async function joinAsMember(browser: Browser, code: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Member');
  await page.getByLabel('Session code').fill(code);
  await page.getByRole('button', { name: 'Join' }).click();
  return { context, page };
}

test('host Start/Pause/Resume/Stop transitions are reflected for a joined member', async ({ page, browser }) => {
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Host');
  await page.getByRole('button', { name: 'Create session' }).click();
  await page.getByRole('button', { name: 'Select' }).first().click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click(); // song/part modal stays open until dismissed
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinAsMember(browser, hostSession.code);
  await memberPage.getByRole('button', { name: 'Select' }).last().click(); // Lyrics
  await memberPage.getByRole('button', { name: 'Close' }).click();

  // Drive readiness past the audio-decode gate (see single-participant.spec.ts's scope note).
  await sendAsParticipant(hostSession, { type: 'readiness-update', readiness: 'ready' });
  const memberSession = await readStoredSession(memberPage);
  await sendAsParticipant(memberSession, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  // Both host and member land in the Playback view once running.
  await expect(page.locator('.playback-controls')).toBeVisible({ timeout: 10_000 });
  await expect(memberPage.locator('.playback-controls')).toBeVisible({ timeout: 10_000 });

  const pauseButton = page.getByRole('button', { name: /Pause|Resume/ }).last();
  await pauseButton.click(); // pause
  await expect(page.getByRole('button', { name: 'Resume' }).last()).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: 'Resume' }).last().click(); // resume
  await expect(page.getByRole('button', { name: 'Pause' }).last()).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: 'Stop' }).last().click(); // stop, back to Lobby for both
  await expect(page.locator('.playback-controls')).toHaveCount(0, { timeout: 10_000 });
  await expect(memberPage.locator('.playback-controls')).toHaveCount(0, { timeout: 10_000 });

  await memberContext.close();
});

test('host removing a participant removes them from the other participant list', async ({ page, browser }) => {
  await page.goto('http://localhost:4173/');
  await page.getByPlaceholder('Musician').fill('Host');
  await page.getByRole('button', { name: 'Create session' }).click();
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinAsMember(browser, hostSession.code);

  // The participant list now lives behind the settings-cog modal's
  // Participants tab (SettingsModal.svelte), not inline in the Lobby body.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Member', { exact: true })).toBeVisible({ timeout: 10_000 });

  // Lobby.svelte (and now SettingsModal.svelte) doesn't currently render a
  // host-facing remove-participant button — the host-remove-participant
  // handler exists server-side (server/src/handlers/host-remove-participant.ts,
  // covered in tasks-test-coverage-bfe8.md's T018) but nothing sends that
  // message from the UI. Drive it directly via the same real WS message a
  // future UI control would send, rather than skip this scenario entirely.
  await sendAsParticipant(hostSession, { type: 'host-remove-participant', participantId: (await readStoredSession(memberPage)).participantId });

  await expect(page.getByText('Member', { exact: true })).toHaveCount(0, { timeout: 10_000 });

  await memberContext.close();
});
