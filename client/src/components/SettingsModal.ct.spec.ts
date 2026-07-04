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

// ---------------------------------------------------------------------------
// Tab structure (plan-worktree-ui-improvements T007/T008): three semantic
// tabs — Participants (list + host transfer), Session (host-broadcast
// controls: lobby cursor, Spotlight, playback audio), Preferences (personal,
// this-device settings: theme).
// ---------------------------------------------------------------------------

test('the modal has Participants, Session, and Preferences tabs, defaulting to Participants', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await expect(component.getByRole('button', { name: 'Participants' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Session' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Preferences' })).toBeVisible();

  // Participants content renders by default; Session content does not.
  await expect(component.getByText('Member')).toBeVisible();
  await expect(component.getByText(/lobby cursor/i)).toHaveCount(0);
});

test('the Preferences tab holds the theme toggle, for any participant', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Preferences' }).click();
  await expect(component.getByText(/Light mode|Dark mode/)).toBeVisible();
});

// --- Session tab: host-broadcast controls ---------------------------------

test('Session tab: a member sees the lobby-cursor readout but no host controls', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ lobbyCursorTick: 960 }), selfParticipantId: 'member-1' },
  });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(component.getByText(/pointing at tick 960/)).toBeVisible();
  await expect(component.getByText('Set lobby cursor')).toHaveCount(0);
  await expect(component.getByText(/Spotlight mode/)).toHaveCount(0);
  await expect(component.getByText('Metronome:')).toHaveCount(0);
  await expect(component.getByText('Count-in:')).toHaveCount(0);
});

test('Session tab: the host sees lobby-cursor, Spotlight, Metronome, and Count-in controls', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(component.getByText('Set lobby cursor')).toBeVisible();
  await expect(component.getByText('Clear')).toBeVisible();
  await expect(component.getByText(/Spotlight mode:/)).toBeVisible();
  await expect(component.getByText(/Metronome:/)).toBeVisible();
  await expect(component.getByText(/Count-in:/)).toBeVisible();
});

test('Session tab: the Spotlight hint copy renders for the host', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(
    component.getByText(
      "Spotlight mode forces every participant's view to follow the lobby cursor. Off: it's just a marker — cursor position and Spotlight state both reset when playback starts.",
    ),
  ).toBeVisible();
});

test('button label/variant reflects metronomeEnabled/countInEnabled', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ metronomeEnabled: false, countInEnabled: true }), selfParticipantId: 'host-1' },
  });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(component.getByText('Metronome: Off')).toBeVisible();
  await expect(component.getByText('Count-in: On')).toBeVisible();
});

test('clicking Metronome sends metronome-set with the flipped value', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ metronomeEnabled: false }), selfParticipantId: 'host-1' },
  });

  await component.getByRole('button', { name: 'Session' }).click();
  await component.getByText('Metronome: Off').click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'metronome-set', enabled: true });
});

test('clicking Count-in sends count-in-set with the flipped value', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ countInEnabled: true }), selfParticipantId: 'host-1' },
  });

  await component.getByRole('button', { name: 'Session' }).click();
  await component.getByText('Count-in: On').click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'count-in-set', enabled: false });
});

// --- Participants tab: host transfer (unchanged semantics) ----------------

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

// --- Phone width -----------------------------------------------------------

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no tab of the modal needs horizontal scrolling at 390px', async ({ mount, page }) => {
    const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

    for (const tab of ['Participants', 'Session', 'Preferences']) {
      await component.getByRole('button', { name: tab }).click();
      const scrollers = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of Array.from(document.querySelectorAll('*'))) {
          if (el.scrollWidth - el.clientWidth <= 0) continue;
          const ox = getComputedStyle(el).overflowX;
          if (ox === 'auto' || ox === 'scroll') out.push(`${el.tagName.toLowerCase()}.${String(el.className)} (+${el.scrollWidth - el.clientWidth}px)`);
        }
        return out;
      });
      expect(scrollers, `${tab} tab: elements requiring horizontal scroll`).toEqual([]);
    }
  });
});
