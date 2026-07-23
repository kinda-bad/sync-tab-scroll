import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from './test-harness/SettingsModalHarness.svelte';
import type { Session } from '@sync-tab-scroll/shared';

// T013 (host-mandated-bars-per-row-layout): the Session tab's host-only
// "Layout" control sends bars-per-row-set, and a personal per-participant
// bars-per-row preference exists in the Preferences tab, persisted
// client-side like the theme/metronome preferences.

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0, userId: null },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1, userId: null },
    ],
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
    ...overrides,
  };
}

test('Session tab: the host sees a "Layout" control that sends bars-per-row-set', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await component.getByRole('button', { name: 'Session' }).click();
  await component.getByRole('button', { name: '4' }).click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'bars-per-row-set', barsPerRow: 4 });
});

test('Session tab: a non-host member does not see the Layout control', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(component.getByText(/Layout/)).toHaveCount(0);
});

test('Preferences tab: any participant has a personal bars-per-row preference, persisted locally, sending nothing', async ({
  mount,
  page,
}) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Preferences' }).click();
  await component.getByRole('button', { name: '4', exact: true }).click();

  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:bars-per-row'));
  expect(stored).toBe('4');

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toEqual([]);
});
