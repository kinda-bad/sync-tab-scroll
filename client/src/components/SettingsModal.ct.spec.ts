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

test('Metronome/Count-in buttons do not render for a non-host', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });
  await expect(component.getByText('Metronome:')).toHaveCount(0);
  await expect(component.getByText('Count-in:')).toHaveCount(0);
});

test('Metronome/Count-in buttons render for the host', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });
  await expect(component.getByText(/Metronome:/)).toBeVisible();
  await expect(component.getByText(/Count-in:/)).toBeVisible();
});

test('button label/variant reflects metronomeEnabled/countInEnabled', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ metronomeEnabled: false, countInEnabled: true }), selfParticipantId: 'host-1' },
  });

  await expect(component.getByText('Metronome: Off')).toBeVisible();
  await expect(component.getByText('Count-in: On')).toBeVisible();
});

test('clicking Metronome sends metronome-set with the flipped value', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ metronomeEnabled: false }), selfParticipantId: 'host-1' },
  });

  await component.getByText('Metronome: Off').click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'metronome-set', enabled: true });
});

test('clicking Count-in sends count-in-set with the flipped value', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ countInEnabled: true }), selfParticipantId: 'host-1' },
  });

  await component.getByText('Count-in: On').click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'count-in-set', enabled: false });
});

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

/**
 * Regression test for the rapid-click cursor-thrash bug
 * (feedback-lobby-cursor-race-4262, tasks-lobby-cursor-race-c9f8 T004/T005):
 * repeatedly clicking "Set lobby cursor" with different input values must
 * collapse into a single `lobby-cursor-set` broadcast (the last value), not
 * one broadcast per click.
 */
test('rapidly clicking "Set lobby cursor" debounces to a single lobby-cursor-set send with the last value', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  const input = component.locator('.cursor-input');
  const setButton = component.getByRole('button', { name: 'Set lobby cursor' });

  await input.fill('100');
  await setButton.click();
  await input.fill('200');
  await setButton.click();
  await input.fill('300');
  await setButton.click();

  await page.waitForTimeout(300);

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: { type: string; tickPosition?: number }[] }).__sentMessages);
  const cursorSets = sent.filter((m) => m.type === 'lobby-cursor-set');
  expect(cursorSets).toEqual([{ type: 'lobby-cursor-set', tickPosition: 300 }]);
});

/**
 * Regression test for the crammed-controls/unclear-Spotlight-relationship
 * feedback (feedback-settings-modal-followup-d914,
 * tasks-settings-modal-followup-bbd2 T001-T003).
 */
test('shows a Spotlight-mode hint under the Lobby cursor group', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await expect(
    component.getByText('Spotlight mode forces every participant\'s view to follow the lobby cursor', { exact: false }),
  ).toBeVisible();
});
