import { test, expect } from '@playwright/test';
import { createSessionAsHost, joinSessionAsMember, readStoredSession, sendAsParticipant } from './helpers';

/**
 * SCOPE NOTE: Spotlight mode's core distinguishing behavior — forcing a
 * participant's alphaTab view to follow the host's lobby cursor — lives
 * inside `playback-engine.ts`'s clientStore subscription, which is gated
 * on `api.isReadyForPlayback`. That gate never resolves under browser
 * automation (same audio-decode limitation documented in
 * `playback-engine.ct.spec.ts` and `single-participant.spec.ts`), so the
 * actual `api.tickPosition` snap-to-match cannot be asserted here. This
 * test instead covers what's genuinely independent of that gate: the
 * server-authoritative session-state sync (lobby cursor readout,
 * Spotlight toggle state, and their auto-reset on playback start) is
 * pure pre-playback Lobby-view state, unrelated to any participant's
 * local playback engine — this is the part `tasks-lobby-cursor-modes-0bea.md`'s
 * blocked T010 was also always capable of verifying regardless of audio.
 */
test('song/part selection sync between host and member', async ({ page, browser }) => {
  await createSessionAsHost(page, 'Host');
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', hostSession.code);

  await page.getByRole('button', { name: 'Select' }).first().click();
  await expect(memberPage.locator('.song-name')).toHaveText('Synthetic Test Song', { timeout: 10_000 });

  // Selecting a part immediately sends readiness-update: 'loading' (App.svelte's
  // ensurePlaybackEngine call, before any audio/readiness gate) — a real,
  // audio-independent, cross-participant-visible signal. The participant
  // list (with readiness badges) now lives behind the settings-cog modal's
  // Participants tab, which is itself blocked by the member's own
  // (forced-open, non-dismissible-until-set) song/part modal — so the
  // member picks their own part too, to dismiss it and reach the cog.
  await page.getByRole('button', { name: 'Select' }).first().click(); // host: the (only) instrument part
  await memberPage.getByRole('button', { name: 'Select' }).first().click(); // member: same part, just to dismiss their own modal
  await memberPage.getByRole('button', { name: 'Close' }).click();
  await memberPage.getByRole('button', { name: 'Settings' }).click();
  await expect(memberPage.locator('.badge').first()).toHaveText('LOADING', { timeout: 10_000 });

  await memberContext.close();
});

test('Spotlight mode: lobby cursor readout syncs to the member, and both fields auto-reset after Start', async ({ page, browser }) => {
  await createSessionAsHost(page, 'Host');
  await page.getByRole('button', { name: 'Select' }).first().click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // the (only) instrument part
  await page.getByRole('button', { name: 'Close' }).click(); // song/part modal stays open until dismissed
  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', hostSession.code);
  await memberPage.getByRole('button', { name: 'Select' }).last().click(); // Lyrics — a different part than the host's
  await memberPage.getByRole('button', { name: 'Close' }).click();

  // Lobby cursor / Spotlight controls now live behind the settings-cog
  // modal's Participants tab (SettingsModal.svelte), not inline in the
  // Lobby body.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('spinbutton').fill('500');
  await page.getByRole('button', { name: 'Set lobby cursor' }).click();

  await expect(page.getByText('Host is pointing at tick 500')).toBeVisible();
  await memberPage.getByRole('button', { name: 'Settings' }).click();
  await expect(memberPage.getByText('Host is pointing at tick 500')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Spotlight mode:/ }).click();
  await expect(page.getByRole('button', { name: 'Spotlight mode: on' })).toBeVisible();

  await sendAsParticipant(hostSession, { type: 'readiness-update', readiness: 'ready' });
  const memberSession = await readStoredSession(memberPage);
  await sendAsParticipant(memberSession, { type: 'readiness-update', readiness: 'ready' });

  // Close the settings modal before Start (Phase 3 verifies Start itself
  // closes it; closing explicitly here keeps this test independent of that).
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Pause|Stop/ }).last().click(); // stop back to Lobby
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('No lobby cursor set.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Spotlight mode: off' })).toBeVisible();

  await memberContext.close();
});
