import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

/**
 * The horizontal view through the real App (feature horizontal-scroll-view):
 * the personal Settings → Preferences row, the band layout it switches to,
 * and the "rotate your phone" prompt for phones in portrait.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gpBuffer = fs.readFileSync(path.resolve(__dirname, '../test-fixtures/synthetic-song.gp'));

const song: CatalogSong = {
  id: 'creep',
  catalogueId: 'default',
  name: 'Creep',
  artist: 'Radiohead',
  gpFilePath: '/fixture.gp',
  parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
  lyricsLrc: null,
  lyricsTrackIndex: 0,
  lyricsLineIndex: 0,
  lyricLineBreaks: [6, 7, 6],
  recordingPath: null,
  syncPoints: null,
};

const session: Session = {
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
  startMarkerBar: null,
};

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
});

async function enterPlayback(page: Page) {
  await page.evaluate(
    ({ session, song }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({ ...(s as object), view: 'playback', session, selfParticipantId: 'p1', catalog: [song], wsClient }));
    },
    { session, song },
  );
  await page.waitForSelector('.engine-containers.visible .at-surface svg', { timeout: 20_000 });
}

async function turnOnHorizontalView(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Preferences' }).click();
  await page.getByRole('button', { name: 'Horizontal view: Off' }).click();
  await expect(page.getByRole('button', { name: 'Horizontal view: On' })).toBeVisible();
  await page.locator('.modal-backdrop').click({ position: { x: 5, y: 40 } });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
}

test('the Preferences row turns the horizontal view on, persisted on this device only, and the tab rebuilds as one line', async ({
  mount,
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await mount(AppHarness);
  await enterPlayback(page);
  await turnOnHorizontalView(page);

  expect(await page.evaluate(() => localStorage.getItem('sync-tab-scroll:horizontal-view'))).toBe('on');
  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages.map((m) => m.type));
  expect(sent.filter((t) => t !== 'readiness-update')).toEqual([]);

  await expect(page.locator('.engine-containers.horizontal')).toBeVisible();
  await expect(page.locator('.hview-playhead')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __getApi: () => { boundsLookup?: { staffSystems: unknown[] } } }).__getApi()?.boundsLookup?.staffSystems.length), { timeout: 20_000 }).toBe(1);
  // No rotate prompt in landscape.
  await expect(page.locator('.hview-rotate-prompt')).toBeHidden();
});

test('a phone in portrait gets a rotate prompt over the tab, which leaves the Bar reachable and offers the paged view', async ({ mount, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(AppHarness);
  await enterPlayback(page);
  await turnOnHorizontalView(page);

  const prompt = page.locator('.hview-rotate-prompt');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('Turn your phone sideways');
  await expect(page.getByRole('button', { name: 'Leave session' })).toBeVisible();
  // The Bar isn't covered: its Settings control is still the topmost element at its own position.
  const box = (await page.getByRole('button', { name: 'Settings' }).first().boundingBox())!;
  const topmost = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label'), {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  });
  expect(topmost).toBe('Settings');

  await prompt.getByRole('button', { name: 'Use the paged view instead' }).click();
  await expect(prompt).toHaveCount(0);
  await expect(page.locator('.engine-containers.horizontal')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('sync-tab-scroll:horizontal-view'))).toBe('off');
});
