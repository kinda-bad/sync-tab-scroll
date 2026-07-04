import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from '../test-harness/SettingsModalHarness.svelte';
import type { Session } from '@sync-tab-scroll/shared';

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    ],
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    metronomeEnabled: false,
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    ...overrides,
  };
}

test('the host sees "Make host" on every other row but not their own, and it sends host-delegate', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await expect(component.getByRole('button', { name: 'Make host' })).toHaveCount(1);
  await component.getByRole('button', { name: 'Make host' }).click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toEqual([{ type: 'host-delegate', targetParticipantId: 'member-1' }]);
});

test('a non-host sees "Request to become host" on their own row, enabled, and it sends request-host', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  const requestButton = component.getByRole('button', { name: 'Request to become host' });
  await expect(requestButton).toBeEnabled();
  await expect(component.getByRole('button', { name: 'Make host' })).toHaveCount(0);

  await requestButton.click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toEqual([{ type: 'request-host' }]);
});

test('a non-host\'s "Request to become host" is disabled while any request is pending', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ pendingHostRequest: 'member-1' }), selfParticipantId: 'member-1' },
  });

  await expect(component.getByRole('button', { name: 'Request to become host' })).toBeDisabled();
});

test('the host sees a "Decline" control on the pending-requester\'s row, and it sends host-request-decline', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ pendingHostRequest: 'member-1' }), selfParticipantId: 'host-1' },
  });

  await expect(component.getByRole('button', { name: 'Make host' })).toHaveCount(1);
  const declineButton = component.getByRole('button', { name: 'Decline' });
  await expect(declineButton).toHaveCount(1);

  await declineButton.click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toEqual([{ type: 'host-request-decline' }]);
});

test('a non-host, non-requesting viewer sees a plain pending label on the requester\'s row, not a Decline button', async ({ mount }) => {
  const session = baseSession({
    pendingHostRequest: 'member-1',
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
      { id: 'member-2', displayName: 'Member 2', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 2 },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-2' } });

  await expect(component.getByRole('button', { name: 'Decline' })).toHaveCount(0);
  await expect(component.getByRole('button', { name: 'Make host' })).toHaveCount(0);
  await expect(component.getByText('Requesting host')).toBeVisible();
});
