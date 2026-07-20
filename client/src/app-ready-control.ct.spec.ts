import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogSong, ReadinessStatus, Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
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
  lyricLineBreaks: [],
  recordingPath: null,
  syncPoints: null,
};

function makeSession(selfReadiness: ReadinessStatus, memberReadiness: ReadinessStatus = 'loaded'): Session {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: selfReadiness, joinedAt: 0, userId: null },
      { id: 'p2', displayName: 'Bob', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: memberReadiness, joinedAt: 1, userId: null },
    ],
    hostId: 'p1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
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

function sentMessages(page: import('@playwright/test').Page): Promise<unknown[]> {
  return page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
}

// T003 (explicit-participant-readiness, ui.md Explicit Readiness): the
// Bar's readiness indicator is the participant's own ready control — clock
// while `loaded` (click to confirm), check while `ready` (click to
// un-ready); loading/no-part render as the non-interactive badge exactly
// as before.
test('loaded: bar shows a clock ready control that sends ready-set true', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, makeSession('loaded'));

  const control = page.getByRole('button', { name: "I'm ready — click to confirm" });
  await expect(control).toBeVisible();
  await expect(control.locator('.lucide-clock')).toBeVisible();

  await control.click();
  expect(await sentMessages(page)).toContainEqual({ type: 'ready-set', ready: true });
});

test('ready: bar shows a check control that sends ready-set false', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, makeSession('ready'));

  const control = page.getByRole('button', { name: 'Ready — click to un-ready' });
  await expect(control).toBeVisible();
  await expect(control.locator('.lucide-check')).toBeVisible();

  await control.click();
  expect(await sentMessages(page)).toContainEqual({ type: 'ready-set', ready: false });
});

test('round-trip: a session-state flip from loaded to ready swaps the control', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, makeSession('loaded'));
  await expect(page.getByRole('button', { name: "I'm ready — click to confirm" })).toBeVisible();

  await setStore(page, makeSession('ready'));
  await expect(page.getByRole('button', { name: 'Ready — click to un-ready' })).toBeVisible();
  await expect(page.getByRole('button', { name: "I'm ready — click to confirm" })).toHaveCount(0);
});

test('loading and no-part render the non-interactive badge, not the control', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, makeSession('loading'));

  await expect(page.locator('.bar-status .badge', { hasText: 'LOADING' })).toBeVisible();
  await expect(page.getByRole('button', { name: /click to confirm|un-ready/ })).toHaveCount(0);

  await setStore(page, makeSession('no-part'));
  await expect(page.locator('.bar-status .badge', { hasText: 'NO PART' })).toBeVisible();
  await expect(page.getByRole('button', { name: /click to confirm|un-ready/ })).toHaveCount(0);
});

// Participants-list rows (Settings modal) show the same clock-vs-check
// distinction per member.
test('participants list badges: clock for loaded, check for ready', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, makeSession('ready', 'loaded'));

  await page.getByRole('button', { name: 'Settings' }).click();

  const aliceRow = page.locator('li', { hasText: 'Alice' });
  const bobRow = page.locator('li', { hasText: 'Bob' });
  await expect(aliceRow.locator('.badge .lucide-check')).toBeVisible();
  await expect(aliceRow.locator('.badge')).toContainText('READY');
  await expect(bobRow.locator('.badge .lucide-clock')).toBeVisible();
  await expect(bobRow.locator('.badge')).toContainText('LOADED');
});
