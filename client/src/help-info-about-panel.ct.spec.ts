import { test, expect } from '@playwright/experimental-ct-svelte';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

// T008 (help-info-about-panel-in-nav-b): a new "?" icon control in the
// persistent nav bar opens a modal with three tabs (About, Info, Help); the
// About tab renders the alphaTab/Songsterr shoutout links, the GitHub source
// link, and the sponsor link.

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

function lobbySession(): Session {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
    ],
    hostId: 'p1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
  };
}

async function setStore(page: import('@playwright/test').Page, session: Session) {
  await page.evaluate(
    ({ session, song }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({ ...(s as object), view: 'lobby', session, selfParticipantId: 'p1', catalog: [song], wsClient }));
    },
    { session, song },
  );
}

test('a "?" nav control opens a modal with About, Info, and Help tabs', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, lobbySession());

  const helpButton = page.getByRole('button', { name: 'Help & About' });
  await expect(helpButton).toBeVisible();
  await helpButton.click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'About', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Info', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
});

test('the About tab renders the alphaTab/Songsterr shoutout, GitHub source link, and sponsor link', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, lobbySession());

  await page.getByRole('button', { name: 'Help & About' }).click();
  await page.getByRole('button', { name: 'About', exact: true }).click();

  await expect(page.getByText(/alphaTab/i)).toBeVisible();
  await expect(page.getByText(/Songsterr/i)).toBeVisible();
  await expect(page.locator('a[href="https://github.com/kinda-bad/sync-tab-scroll"]')).toBeVisible();
  await expect(page.locator('a[href="https://github.com/sponsors/moui72"]')).toBeVisible();
});
