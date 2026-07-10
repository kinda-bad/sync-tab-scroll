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
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
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

test('the Preferences tab holds two orthogonal theme controls, for any participant', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Preferences' }).click();
  await expect(component.getByText(/Theme: Riot|Theme: Cyberpunk/)).toBeVisible();
  await expect(component.getByText(/Light mode|Dark mode/)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Two orthogonal theme controls (brand.md Themes, ui.md Preferences): a
// theme-family picker (riot/cyberpunk) and the existing light/dark toggle,
// computing one of 4 flat `data-theme` values. Each control must act
// independently of the other, and the combined value must persist across a
// simulated reload (re-reading localStorage, same as theme.ts's own
// loadStoredTheme/persistTheme round-trip).
// ---------------------------------------------------------------------------

const THEME_COMBINATIONS: Array<{ family: 'Riot' | 'Cyberpunk'; mode: 'Dark' | 'Light'; expected: string }> = [
  { family: 'Riot', mode: 'Dark', expected: 'dark' },
  { family: 'Riot', mode: 'Light', expected: 'light' },
  { family: 'Cyberpunk', mode: 'Dark', expected: 'cyberpunk-dark' },
  { family: 'Cyberpunk', mode: 'Light', expected: 'cyberpunk-light' },
];

for (const { family, mode, expected } of THEME_COMBINATIONS) {
  test(`selecting theme-family=${family} + mode=${mode} produces data-theme='${expected}' and persists it`, async ({ mount, page }) => {
    // Start from a known baseline (riot/dark) so every combination is
    // reached by an explicit number of clicks, not assumed default state.
    // Also set `data-theme` directly, mirroring main.ts's own bootstrap
    // (`applyTheme(loadStoredTheme() ?? 'dark')` runs before any view
    // mounts in the real app) — the modal itself never calls `applyTheme`
    // on mount, only in response to a click.
    await page.evaluate(() => {
      localStorage.setItem('sync-tab-scroll:theme', 'dark');
      document.documentElement.dataset.theme = 'dark';
    });
    const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });
    await component.getByRole('button', { name: 'Preferences' }).click();

    if (family === 'Cyberpunk') {
      await component.getByText('Theme: Riot').click();
    }
    if (mode === 'Light') {
      // Buttons are labeled with the mode a click switches *to* — starting
      // from the 'dark' baseline, that button reads "Light mode".
      await component.getByText('Light mode').click();
    }

    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(expected);

    const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:theme'));
    expect(stored).toBe(expected);

    // Simulated reload: unmount, reset `data-theme` off, then a fresh
    // mount + bootstrap re-reads localStorage the same way main.ts's own
    // bootstrap does (loadStoredTheme() ?? 'dark') — Playwright CT mounts
    // don't survive a real page.reload(), so this is the closest
    // equivalent; must unmount the first component first, since a second
    // mount() call appends rather than replaces.
    await component.unmount();
    await page.evaluate(() => {
      document.documentElement.dataset.theme = '';
    });
    const reloadedTheme = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:theme'));
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t ?? 'dark';
    }, reloadedTheme);
    const component2 = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });
    await component2.getByRole('button', { name: 'Preferences' }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(expected);
  });
}

test('the theme-family picker and light/dark toggle act independently: switching mode does not reset family', async ({ mount, page }) => {
  await page.evaluate(() => localStorage.setItem('sync-tab-scroll:theme', 'cyberpunk-dark'));
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });
  await component.getByRole('button', { name: 'Preferences' }).click();

  await expect(component.getByText('Theme: Cyberpunk')).toBeVisible();
  await component.getByText('Light mode').click();

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('cyberpunk-light');
  await expect(component.getByText('Theme: Cyberpunk')).toBeVisible();
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
  await expect(component.getByText('Count-in:')).toHaveCount(0);
});

test('Session tab: the host sees lobby-cursor, Spotlight, and Count-in controls (metronome is personal, not here)', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(component.getByText('Set lobby cursor')).toBeVisible();
  await expect(component.getByText('Clear')).toBeVisible();
  await expect(component.getByText(/Spotlight mode:/)).toBeVisible();
  await expect(component.getByText(/Count-in:/)).toBeVisible();
  await expect(component.getByText(/Metronome:/)).toHaveCount(0);
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

test('button label reflects countInEnabled', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: baseSession({ countInEnabled: true }), selfParticipantId: 'host-1' },
  });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(component.getByText('Count-in: On')).toBeVisible();
});

// --- Preferences tab: personal, this-device settings -----------------------

test('Preferences tab: any participant sees the personal metronome toggle; clicking it persists locally and sends nothing', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Preferences' }).click();
  await expect(component.getByText('Metronome: Off')).toBeVisible();

  await component.getByText('Metronome: Off').click();
  await expect(component.getByText('Metronome: On')).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:metronome'));
  expect(stored).toBe('on');

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toEqual([]);
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

test('the host sees a "Remove" control on every other row but not their own, and it sends host-remove-participant', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await expect(component.getByRole('button', { name: 'Remove' })).toHaveCount(1);
  await component.getByRole('button', { name: 'Remove' }).click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'host-remove-participant', participantId: 'member-1' });
});

test('a non-host does not see a "Remove" control on any row', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await expect(component.getByRole('button', { name: 'Remove' })).toHaveCount(0);
});

// --- Participants tab: selected-part display (plan-participant-selected-part) ---

test('a row shows the participant\'s selected instrument part in the sublabel', async ({ mount }) => {
  const session = baseSession({
    availableParts: [{ trackIndex: 0, instrumentName: 'Lead Guitar' }],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 1 },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'host-1' } });

  await expect(component.getByText('Lead Guitar')).toBeVisible();
});

test('a row shows "Lyrics" for a participant on the tab-less lyrics part', async ({ mount }) => {
  const session = baseSession({
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 'lyrics', readiness: 'ready', joinedAt: 1 },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'host-1' } });

  await expect(component.getByText('Lyrics')).toBeVisible();
});

test('the host row combines "HOST" and the selected part as "HOST · <part>"', async ({ mount }) => {
  const session = baseSession({
    availableParts: [{ trackIndex: 0, instrumentName: 'Lead Guitar' }],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await expect(component.getByText('HOST · Lead Guitar')).toBeVisible();
});

test('a row with no selected part shows no part text', async ({ mount }) => {
  const session = baseSession({
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'host-1' } });

  await expect(component.getByText('HOST', { exact: true })).toBeVisible();
  await expect(component.getByText(/HOST ·/)).toHaveCount(0);
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
  await component.getByRole('button', { name: 'Session' }).click();

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
  await component.getByRole('button', { name: 'Session' }).click();

  await expect(
    component.getByText('Spotlight mode forces every participant\'s view to follow the lobby cursor', { exact: false }),
  ).toBeVisible();
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
