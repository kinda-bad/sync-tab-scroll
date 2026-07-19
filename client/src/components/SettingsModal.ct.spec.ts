import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from '../test-harness/SettingsModalHarness.svelte';
import type { Session } from '@sync-tab-scroll/shared';

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
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
// Tab structure (plan-1619-2026-07-17-39c6.md T016-T018): four semantic
// tabs — Participants (list + host transfer), Session (host-broadcast
// controls: lobby cursor, Spotlight, playback audio), Preferences (personal,
// this-device settings: theme), and Tracks (personal per-part mute
// controls, moved out of Preferences into its own tab — one row per part).
// ---------------------------------------------------------------------------

test('the modal has Participants, Session, Preferences, and Tracks tabs, defaulting to Participants', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await expect(component.getByRole('button', { name: 'Participants' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Session' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Preferences' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Tracks' })).toBeVisible();

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

// --- Preferences tab: lyrics ticker font size + measure markers (T002/T004) ---

test('Preferences tab: the lyrics ticker font size control renders all four options and selecting one persists it', async ({
  mount,
  page,
}) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Preferences' }).click();
  await expect(component.getByRole('button', { name: 'Small' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Medium' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Large' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Huge' })).toBeVisible();

  await component.getByRole('button', { name: 'Huge' }).click();

  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:lyrics-ticker-font-size'));
  expect(stored).toBe('huge');
});

test('Preferences tab: the "Measure markers" toggle defaults off, persists, and sends nothing', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Preferences' }).click();
  await expect(component.getByText('Measure markers: Off')).toBeVisible();

  await component.getByText('Measure markers: Off').click();
  await expect(component.getByText('Measure markers: On')).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:lyrics-measure-markers'));
  expect(stored).toBe('on');

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toEqual([]);
});

// --- Tracks tab: personal per-part mute controls (T016-T018, own 4th tab) --

/**
 * T004 (tasks-part-mute-toggle-f0d4.md), moved to its own Tracks tab by
 * T016-T018 (plan-1619-2026-07-17-39c6.md, ui.md Tracks tab): a per-part
 * mute toggle for every entry in Session.availableParts, personal and
 * client-local (like the Metronome toggle in Preferences) — never a WS send.
 */
test('Tracks tab: a mute toggle renders per available part, reflecting stored mute state, and clicking flips its own visible state', async ({
  mount,
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem('sync-tab-scroll:mute:creep:1', 'on');
  });

  const session = baseSession({
    selectedSong: 'creep',
    availableParts: [
      { trackIndex: 0, instrumentName: 'Lead Guitar' },
      { trackIndex: 1, instrumentName: 'Bass' },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Tracks' }).click();

  await expect(component.getByRole('button', { name: 'Mute Lead Guitar' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Unmute Bass' })).toBeVisible();

  await component.getByRole('button', { name: 'Mute Lead Guitar' }).click();
  await expect(component.getByRole('button', { name: 'Unmute Lead Guitar' })).toBeVisible();

  await component.getByRole('button', { name: 'Unmute Bass' }).click();
  await expect(component.getByRole('button', { name: 'Mute Bass' })).toBeVisible();
});

/**
 * T005 (tasks-part-mute-toggle-f0d4.md): confirms the click handler
 * actually calls persistTrackMute (not just local component state) —
 * loadStoredTrackMute must reflect the new value after a toggle click.
 */
test('Tracks tab: clicking a mute toggle persists via track-mute-preference (round-trips through loadStoredTrackMute)', async ({ mount, page }) => {
  const session = baseSession({
    selectedSong: 'creep',
    availableParts: [{ trackIndex: 0, instrumentName: 'Lead Guitar' }],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Tracks' }).click();
  await component.getByRole('button', { name: 'Mute Lead Guitar' }).click();
  await expect(component.getByRole('button', { name: 'Unmute Lead Guitar' })).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:creep:0'));
  expect(stored).toBe('on');
});

/**
 * T006 (tasks-part-mute-toggle-f0d4.md, ui.md "no restriction" decision):
 * regression guard — a participant CAN mute the part they currently have
 * selected/rendered (Participant.selectedPart matching the toggled part's
 * trackIndex). Some practice workflows want to hear only the backing while
 * reading their own tab; nothing in this code path should block this.
 */
test('Tracks tab: a participant can mute their own currently-selected part (no restriction)', async ({ mount, page }) => {
  const session = baseSession({
    selectedSong: 'creep',
    availableParts: [
      { trackIndex: 0, instrumentName: 'Lead Guitar' },
      { trackIndex: 1, instrumentName: 'Bass' },
    ],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 1 , userId: null},
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Tracks' }).click();

  // member-1's own selectedPart is trackIndex 0 ("Lead Guitar") — muting it
  // must succeed exactly like muting any other part.
  await expect(component.getByRole('button', { name: 'Mute Lead Guitar' })).toBeVisible();
  await component.getByRole('button', { name: 'Mute Lead Guitar' }).click();
  await expect(component.getByRole('button', { name: 'Unmute Lead Guitar' })).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:creep:0'));
  expect(stored).toBe('on');
});

test('Tracks tab: shows the personal-scope hint below the per-part mute rows', async ({ mount }) => {
  const session = baseSession({ selectedSong: 'creep', availableParts: [{ trackIndex: 0, instrumentName: 'Lead Guitar' }] });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Tracks' }).click();
  await expect(component.getByText("Only you don't hear muted parts — everyone else still does.")).toBeVisible();
});

/**
 * T017/T018 (plan-1619-2026-07-17-39c6.md): each part renders in its own
 * row, not a shared wrapped row of buttons — the feedback's explicit "1
 * line per part" ask.
 */
test('Tracks tab: each part renders in its own row', async ({ mount, page }) => {
  const session = baseSession({
    selectedSong: 'creep',
    availableParts: [
      { trackIndex: 0, instrumentName: 'Lead Guitar' },
      { trackIndex: 1, instrumentName: 'Bass' },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Tracks' }).click();

  const rowCount = await page.evaluate(() => document.querySelectorAll('.track-row').length);
  // One .track-row per part -- not one shared row wrapping every part's
  // button together.
  expect(rowCount).toBe(2);
});

/**
 * T005 (tasks-settings-personal-prefs-bundle-ed57): a "Solo" button per
 * part row — clicking it mutes every other part while leaving the soloed
 * one unmuted, via the same track-mute-preference.ts persistence as the
 * ordinary mute toggles (no separate "solo" concept).
 */
test('Tracks tab: clicking "Solo" on a part mutes every other part, leaves it unmuted, and persists via track-mute-preference', async ({
  mount,
  page,
}) => {
  const session = baseSession({
    selectedSong: 'creep',
    availableParts: [
      { trackIndex: 0, instrumentName: 'Lead Guitar' },
      { trackIndex: 1, instrumentName: 'Bass' },
      { trackIndex: 2, instrumentName: 'Drums' },
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Tracks' }).click();

  await expect(component.getByRole('button', { name: 'Mute Lead Guitar' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Mute Bass' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Mute Drums' })).toBeVisible();

  const bassRow = component.locator('.track-row', { hasText: 'Bass' });
  await bassRow.getByRole('button', { name: 'Solo' }).click();

  await expect(component.getByRole('button', { name: 'Mute Bass' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Unmute Lead Guitar' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Unmute Drums' })).toBeVisible();

  const storedLead = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:creep:0'));
  const storedBass = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:creep:1'));
  const storedDrums = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:creep:2'));
  expect(storedLead).toBe('on');
  expect(storedBass).toBe('off');
  expect(storedDrums).toBe('on');
});

test('Preferences tab: no longer renders any mute-parts controls (moved to the Tracks tab)', async ({ mount }) => {
  const session = baseSession({ selectedSong: 'creep', availableParts: [{ trackIndex: 0, instrumentName: 'Lead Guitar' }] });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  await component.getByRole('button', { name: 'Preferences' }).click();

  await expect(component.getByText(/Lead Guitar:/)).toHaveCount(0);
  await expect(component.getByText("Only you don't hear muted parts — everyone else still does.")).toHaveCount(0);
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
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 1 , userId: null},
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'host-1' } });

  await expect(component.getByText('Lead Guitar')).toBeVisible();
});

test('a row shows "Lyrics" for a participant on the tab-less lyrics part', async ({ mount }) => {
  const session = baseSession({
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 'lyrics', readiness: 'ready', joinedAt: 1 , userId: null},
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'host-1' } });

  await expect(component.getByText('Lyrics')).toBeVisible();
});

// T003 (tasks-icons-a11y-ticker-a10d.md, feedback F002): the "HOST" text
// badge is replaced by a lucide crown icon; the designation stays announced
// via visually-hidden "Host" text next to the aria-hidden icon.
test('the host row shows a crown icon (with SR-only "Host" text) alongside the selected part', async ({ mount }) => {
  const session = baseSession({
    availableParts: [{ trackIndex: 0, instrumentName: 'Lead Guitar' }],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });

  const hostRow = component.locator('.row', { hasText: 'Host' }).first();
  await expect(hostRow.locator('svg.lucide-crown')).toBeVisible();
  await expect(hostRow.locator('svg.lucide-crown')).toHaveAttribute('aria-hidden', 'true');
  // Accessible announcement survives the icon swap: SR-only text "Host".
  await expect(hostRow.locator('.sr-only', { hasText: 'Host' })).toHaveCount(1);
  await expect(hostRow.getByText('Lead Guitar')).toBeVisible();
  await expect(component.getByText(/HOST/)).toHaveCount(0);
});

test('a row with no selected part shows no part text', async ({ mount }) => {
  const session = baseSession({
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
    ],
  });
  const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'host-1' } });

  // Crown badge present even with no part selected; no "HOST" text at all.
  await expect(component.locator('svg.lucide-crown')).toBeVisible();
  await expect(component.getByText(/HOST/)).toHaveCount(0);
});

test('a non-host, non-requesting viewer sees a plain pending label on the requester\'s row, not a Decline button', async ({ mount }) => {
  const session = baseSession({
    pendingHostRequest: 'member-1',
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
      { id: 'member-2', displayName: 'Member 2', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 2 , userId: null},
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

    for (const tab of ['Participants', 'Session', 'Preferences', 'Tracks']) {
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

// ---------------------------------------------------------------------------
// T004 (tasks-settings-ux-bundle-02e8.md): redesigned Tracks tab rows —
// exactly one line each: a display-only label (instrument prominent +
// detail dim, via part-display-name.ts), marquee (bounce) scroll only on
// overflow and never wrapping; a small icon-only mute button (lucide
// volume-off when muted / volume-2 when audible) via the Button iconOnly +
// tooltip idiom; Solo stays a text button. Plus the "Mute all" control
// (feature mute-all-parts-button): one action batch-mutes every part
// (same changeTrackMute mechanism as Solo), toggling back to all-unmuted
// when everything is already muted (plan OQ2 default); count-in/metronome
// stay untouched (countInVolume/metronomeVolume, never track channels);
// per-(song,track) persistence unchanged.
// ---------------------------------------------------------------------------

test.describe('Tracks tab redesign (T004)', () => {
  const trackSession = () =>
    baseSession({
      selectedSong: 'tiro',
      availableParts: [
        { trackIndex: 0, instrumentName: 'M. Bellamy (Vocals)' },
        { trackIndex: 1, instrumentName: 'Chris (bass)' },
        { trackIndex: 2, instrumentName: 'Dom (drums)' },
      ],
    });

  test('each part renders as a single-line row with a display-only, instrument-prominent label', async ({ mount, page }) => {
    const component = await mount(SettingsModalHarness, { props: { session: trackSession(), selfParticipantId: 'member-1' } });
    await component.getByRole('button', { name: 'Tracks' }).click();

    await expect(component.locator('.track-row')).toHaveCount(3);

    // The label is not a button/interactive element; instrument prominent,
    // detail (performer) de-emphasized but present.
    const firstLabel = component.locator('.track-row').first().getByTestId('track-label');
    await expect(firstLabel).toBeVisible();
    const tag = await firstLabel.evaluate((el) => el.tagName.toLowerCase());
    expect(tag).not.toBe('button');
    await expect(firstLabel.locator('.track-instrument')).toHaveText('Vocals');
    await expect(firstLabel.locator('.track-detail')).toHaveText('M. Bellamy');

    // One line: the label never wraps.
    const whiteSpace = await firstLabel
      .getByTestId('track-marquee')
      .evaluate((el) => getComputedStyle(el).whiteSpace);
    expect(whiteSpace).toBe('nowrap');
  });

  test('the mute control is a small icon-only button toggling volume-2 (audible) to volume-off (muted), persisting per song+track', async ({
    mount,
    page,
  }) => {
    const component = await mount(SettingsModalHarness, { props: { session: trackSession(), selfParticipantId: 'member-1' } });
    await component.getByRole('button', { name: 'Tracks' }).click();

    const bassRow = component.locator('.track-row', { hasText: 'Bass' });
    const muteButton = bassRow.getByRole('button', { name: 'Mute Bass · Chris' });
    await expect(muteButton).toBeVisible();
    // Icon-only: no visible text, lucide volume-2 while audible.
    await expect(muteButton.locator('svg.lucide-volume-2')).toBeVisible();
    await expect(muteButton).toHaveText('');

    await muteButton.click();
    const unmuteButton = bassRow.getByRole('button', { name: 'Unmute Bass · Chris' });
    await expect(unmuteButton.locator('svg.lucide-volume-off')).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:tiro:1'));
    expect(stored).toBe('on');
  });

  test('Solo stays a text button on the redesigned rows', async ({ mount, page }) => {
    const component = await mount(SettingsModalHarness, { props: { session: trackSession(), selfParticipantId: 'member-1' } });
    await component.getByRole('button', { name: 'Tracks' }).click();

    const bassRow = component.locator('.track-row', { hasText: 'Bass' });
    const solo = bassRow.getByRole('button', { name: 'Solo' });
    await expect(solo).toHaveText('Solo');
    await solo.click();

    expect(await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:tiro:0'))).toBe('on');
    expect(await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:tiro:1'))).toBe('off');
    expect(await page.evaluate(() => localStorage.getItem('sync-tab-scroll:mute:tiro:2'))).toBe('on');
  });

  test('a long label marquees (bounce animation) only when its content overflows the row; short labels do not animate', async ({
    mount,
    page,
  }) => {
    const session = baseSession({
      selectedSong: 'tiro',
      availableParts: [
        { trackIndex: 0, instrumentName: 'Bass' },
        {
          trackIndex: 1,
          instrumentName: 'An Extremely Long Performer Name That Cannot Possibly Fit (Vocals)',
        },
      ],
    });
    await page.setViewportSize({ width: 420, height: 800 });
    const component = await mount(SettingsModalHarness, { props: { session, selfParticipantId: 'member-1' } });
    await component.getByRole('button', { name: 'Tracks' }).click();

    const shortMarquee = component.locator('.track-row').nth(0).getByTestId('track-marquee');
    const longMarquee = component.locator('.track-row').nth(1).getByTestId('track-marquee');

    // Overflow measured (content vs container, lyrics-ticker style) and
    // reflected as a data attribute driving the CSS animation.
    await expect(longMarquee).toHaveAttribute('data-overflowing', 'true');
    await expect(shortMarquee).toHaveAttribute('data-overflowing', 'false');

    const longAnim = await longMarquee.evaluate((el) => getComputedStyle(el).animationName);
    const shortAnim = await shortMarquee.evaluate((el) => getComputedStyle(el).animationName);
    expect(longAnim).not.toBe('none');
    expect(shortAnim).toBe('none');

    // Bounce style: scroll-out-pause-return, i.e. an alternating animation,
    // not an infinite one-direction loop.
    const direction = await longMarquee.evaluate((el) => getComputedStyle(el).animationDirection);
    expect(direction).toContain('alternate');
  });

  test('"Mute all" mutes every part in one action and persists per song+track; pressing again unmutes all (simple toggle)', async ({
    mount,
    page,
  }) => {
    const component = await mount(SettingsModalHarness, { props: { session: trackSession(), selfParticipantId: 'member-1' } });
    await component.getByRole('button', { name: 'Tracks' }).click();

    const muteAll = component.getByRole('button', { name: 'Mute all' });
    await expect(muteAll).toBeVisible({ timeout: 3000 });
    await muteAll.click();
    for (const idx of [0, 1, 2]) {
      expect(await page.evaluate((i) => localStorage.getItem(`sync-tab-scroll:mute:tiro:${i}`), idx)).toBe('on');
    }
    for (const idx of [0, 1, 2]) {
      const muteButtons = component.locator('.track-row').nth(idx).locator('svg.lucide-volume-off');
      await expect(muteButtons).toHaveCount(1);
    }

    // Everything muted: the same control now unmutes all.
    await component.getByRole('button', { name: 'Unmute all' }).click();
    for (const idx of [0, 1, 2]) {
      expect(await page.evaluate((i) => localStorage.getItem(`sync-tab-scroll:mute:tiro:${i}`), idx)).toBe('off');
    }
  });

  test('"Mute all" never touches count-in/metronome (no WS sends, metronome preference untouched)', async ({ mount, page }) => {
    await page.evaluate(() => localStorage.setItem('sync-tab-scroll:metronome', 'on'));
    const component = await mount(SettingsModalHarness, { props: { session: trackSession(), selfParticipantId: 'member-1' } });
    await component.getByRole('button', { name: 'Tracks' }).click();

    const muteAll = component.getByRole('button', { name: 'Mute all' });
    await expect(muteAll).toBeVisible({ timeout: 3000 });
    await muteAll.click();

    // Track mutes go through changeTrackMute (track channels) only: nothing
    // is broadcast, and the personal metronome preference — the client-side
    // seam feeding metronomeVolume — is untouched. countInEnabled is
    // session state; no count-in-set was sent either.
    const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
    expect(sent).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('sync-tab-scroll:metronome'))).toBe('on');
  });
});
