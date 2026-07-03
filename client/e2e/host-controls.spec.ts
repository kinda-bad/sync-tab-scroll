import { test, expect } from '@playwright/test';
import { createSessionAsHost, joinSessionAsMember, readStoredSession, sendAsParticipant } from './helpers';

test('host Start/Pause/Resume/Stop transitions are reflected for a joined member', async ({ page, browser }) => {
  await createSessionAsHost(page, 'Host');
  await page.getByRole('button', { name: 'Select' }).first().click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click(); // song/part modal stays open until dismissed
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', hostSession.code);
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
  await createSessionAsHost(page, 'Host');
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', hostSession.code);
  await expect(page.getByText('Member', { exact: true })).toBeVisible({ timeout: 10_000 });

  // Lobby.svelte doesn't currently render a host-facing remove-participant
  // button — the host-remove-participant handler exists server-side
  // (server/src/handlers/host-remove-participant.ts, covered in
  // tasks-test-coverage-bfe8.md's T018) but nothing sends that message from
  // the UI. Drive it directly via the same real WS message a future UI
  // control would send, rather than skip this scenario entirely.
  await sendAsParticipant(hostSession, { type: 'host-remove-participant', participantId: (await readStoredSession(memberPage)).participantId });

  await expect(page.getByText('Member', { exact: true })).toHaveCount(0, { timeout: 10_000 });

  await memberContext.close();
});
