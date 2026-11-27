import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from './test-harness/SettingsModalHarness.svelte';
import type { Session } from '@sync-tab-scroll/shared';

// T013 (host-mandated-bars-per-row-layout), regrouped by
// settings-menu-reorganization: the View tab's "Bars per row" group holds
// both the personal per-participant preference (persisted client-side like
// the theme/metronome preferences) and, for the host, the "For everyone"
// pin that sends bars-per-row-set.

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
    startMarkerBar: null,
    ...overrides,
  };
}

test('View tab: the host sees an "Everyone\'s bars per row" control that sends bars-per-row-set', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await component.getByRole('button', { name: 'View' }).click();
  await component.getByRole('group', { name: "Everyone's bars per row" }).getByRole('button', { name: '4', exact: true }).click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'bars-per-row-set', barsPerRow: 4 });
});

test('View tab: a non-host member does not see the host\'s bars-per-row pin', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'View' }).click();
  await expect(component.getByRole('group', { name: "Everyone's bars per row" })).toHaveCount(0);
  await expect(component.getByRole('group', { name: 'Your bars per row' })).toBeVisible();
});

test('View tab: while the host has pinned a layout, a member is told their own choice is overridden', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession({ hostBarsPerRow: 5 }), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'View' }).click();
  await expect(component.getByText('The host has pinned everyone to 5 bars per row. Your own choice comes back once they clear it.')).toBeVisible();
});

test('View tab: any participant has a personal bars-per-row preference, persisted locally, sending nothing', async ({
  mount,
  page,
}) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'View' }).click();
  await component.getByRole('group', { name: 'Your bars per row' }).getByRole('button', { name: '4', exact: true }).click();

  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:bars-per-row'));
  expect(stored).toBe('4');

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toEqual([]);
});
