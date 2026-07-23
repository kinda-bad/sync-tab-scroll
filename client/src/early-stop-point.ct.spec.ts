import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from './test-harness/SettingsModalHarness.svelte';
import type { Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';
import type { CatalogSong } from '@sync-tab-scroll/shared';

// T019 (host-set-early-stop-point-for): the Session tab's host-only
// "Early stop point" control sends early-stop-set, and the Playback View
// visually de-emphasizes tab content past the stop tick for every
// participant.

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
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

test('Session tab: the host sees an "Early stop point" control that sends early-stop-set', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: baseSession(), selfParticipantId: 'host-1' } });

  await component.getByRole('button', { name: 'Session' }).click();
  await component.getByRole('button', { name: 'Set early-stop point' }).click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent.some((m) => (m as { type: string }).type === 'early-stop-set')).toBe(true);
});

test('Session tab: a non-host member does not see the Early stop point control', async ({ mount }) => {
  const component = await mount(SettingsModalHarness, {
    props: {
      session: { ...baseSession(), participants: [{ id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1, userId: null }] },
      selfParticipantId: 'member-1',
    },
  });

  await component.getByRole('button', { name: 'Session' }).click();
  await expect(component.getByText(/Early stop point/)).toHaveCount(0);
});

const song: CatalogSong = {
  id: 'creep',
  catalogueId: 'default',
  name: 'Creep',
  artist: 'Radiohead',
  gpFilePath: '/fixture.gp',
  parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
  lyricsLrc: null,
  lyricsTrackIndex: null,
  lyricsLineIndex: null,
  lyricLineBreaks: null,
  recordingPath: null,
  syncPoints: null,
};

async function setStore(page: import('@playwright/test').Page, session: Session) {
  await page.evaluate(
    ({ session, song }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({ ...(s as object), view: 'playback', session, selfParticipantId: 'host-1', catalog: [song], wsClient }));
    },
    { session, song },
  );
}

test('Playback View de-emphasizes tab content past the early-stop tick', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, baseSession({ earlyStopTick: 500, playbackState: { status: 'running', tickPosition: 0, bpm: 120, serverTimestamp: 0 } }));

  await expect(page.locator('.early-stop-dimmed')).toHaveCount(1);
});
