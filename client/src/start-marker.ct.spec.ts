import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from './test-harness/SettingsModalHarness.svelte';
import type { Session } from '@sync-tab-scroll/shared';

// per-song-default-start-point: the Session tab's "Start marker" section.
// Everyone sees where Stop returns to; only the host can set or clear it
// (start-marker-set), mirroring the Early stop point control.

const member = { id: 'member-1', displayName: 'Member', role: 'member' as const, connectionStatus: 'connected' as const, selectedPart: null, readiness: 'no-part' as const, joinedAt: 1, userId: null };

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
      member,
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
    startMarkerBar: 9,
    ...overrides,
  };
}

function sentMarkerMessages(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages.filter((m) => m.type === 'start-marker-set'),
  );
}

test('the host sees the marker and can clear it', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });
  await component.getByRole('button', { name: 'Session' }).click();

  await expect(component.getByText('Stop returns to bar 9.')).toBeVisible();
  await component.getByRole('button', { name: 'Clear start marker' }).click();

  expect(await sentMarkerMessages(page)).toEqual([{ type: 'start-marker-set', bar: null }]);
});

test('the host can set the marker to a bar', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession({ startMarkerBar: null }), selfParticipantId: 'host-1' } });
  await component.getByRole('button', { name: 'Session' }).click();

  await expect(component.getByText('No start marker. Stop returns to bar 1.')).toBeVisible();
  await component.getByLabel('Start marker bar').fill('5');
  await component.getByRole('button', { name: 'Set start marker' }).click();

  expect(await sentMarkerMessages(page)).toEqual([{ type: 'start-marker-set', bar: 5 }]);
});

test('a non-host sees the marker but no controls', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });
  await component.getByRole('button', { name: 'Session' }).click();

  await expect(component.getByText('Stop returns to bar 9.')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Clear start marker' })).toHaveCount(0);
  await expect(component.getByRole('button', { name: 'Set start marker' })).toHaveCount(0);
  await expect(component.getByLabel('Start marker bar')).toHaveCount(0);
});
