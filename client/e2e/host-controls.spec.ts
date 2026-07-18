import { test, expect } from '@playwright/test';
import { createSessionAsHost, joinSessionAsMember, readStoredSession, sendAsParticipant } from './helpers';

test('host Start/Pause/Resume/Stop transitions are reflected for a joined member', async ({ page, browser }) => {
  await createSessionAsHost(page, 'Host');
  await page.getByRole('button', { name: 'Select' }).first().click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // the (only) instrument part — selecting a part auto-closes the modal
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', hostSession.code);
  await memberPage.getByRole('button', { name: 'Select' }).last().click(); // Lyrics — auto-closes the modal

  // Drive readiness past the audio-decode gate (see single-participant.spec.ts's scope note).
  await sendAsParticipant(hostSession, { type: 'readiness-update', readiness: 'ready' });
  const memberSession = await readStoredSession(memberPage);
  await sendAsParticipant(memberSession, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();

  // Both host and member land in the Playback view once running. The host
  // is on an instrument part (.playback-controls, inside .app-content) but
  // the member picked Lyrics — App.svelte collapses .app-content entirely
  // for the lyrics part (`.app-content.collapsed { display: none }`,
  // ui.md Playback View) since that participant's view is the separate
  // .full-lyrics-view element instead.
  await expect(page.locator('.playback-controls')).toBeVisible({ timeout: 10_000 });
  await expect(memberPage.locator('.full-lyrics-view')).toBeVisible({ timeout: 10_000 });

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

test('host removing a participant removes them from the other participant list, and the removed participant is toasted back to Landing without reconnecting', async ({ page, browser }) => {
  await createSessionAsHost(page, 'Host');
  // The song/part modal is forced open (non-dismissible) until this
  // participant has both a song and a part — which also blocks the
  // settings-cog control behind its backdrop. Select both first — picking
  // a part auto-closes the modal — so the cog can be reached.
  await page.getByRole('button', { name: 'Select' }).first().click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // the (only) instrument part

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', (await readStoredSession(page)).code);

  // The participant list now lives behind the settings-cog modal's
  // Participants tab (SettingsModal.svelte), not inline in the Lobby body.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Member', { exact: true })).toBeVisible({ timeout: 10_000 });

  // Drive the real UI control (tasks-defects-followup-c196.md T002) rather
  // than sending the WS message directly — this also exercises the
  // removed participant's client-side self-removal handling (ws-client.ts),
  // not just the server handler.
  await page.getByRole('button', { name: 'Remove' }).click();

  await expect(page.getByText('Member', { exact: true })).toHaveCount(0, { timeout: 10_000 });

  // The removed participant: toast, reset to Landing, persisted identity
  // cleared (ui.md "Removed from session" state).
  await expect(memberPage.getByText('You were removed from the session by the host')).toBeVisible({ timeout: 10_000 });
  await expect(memberPage.getByRole('button', { name: 'Create a session' })).toBeVisible({ timeout: 10_000 });
  await expect(memberPage.getByRole('button', { name: 'Join a session' })).toBeVisible();
  expect(await memberPage.evaluate(() => localStorage.getItem('sync-tab-scroll:session'))).toBeNull();

  // No silent reconnect: still on Landing well past the fixed reconnect
  // interval (ws-client.ts's reconnectDelayMs), not pulled back into a
  // session it was just removed from.
  await memberPage.waitForTimeout(3_000);
  await expect(memberPage.getByRole('button', { name: 'Create a session' })).toBeVisible();

  await memberContext.close();
});
