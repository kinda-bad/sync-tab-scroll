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

function makeSession(memberReadiness: ReadinessStatus[], selfId = 'p1'): { session: Session; selfId: string } {
  return {
    selfId,
    session: {
      code: 'ABCD',
      selectedSong: 'creep',
      availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
      participants: [
        { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
        ...memberReadiness.map((readiness, i) => ({
          id: `m${i + 1}`,
          displayName: `Member ${i + 1}`,
          role: 'member' as const,
          connectionStatus: 'connected' as const,
          selectedPart: 0 as const,
          readiness,
          joinedAt: i + 1,
          userId: null,
        })),
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
    },
  };
}

async function setStore(
  page: import('@playwright/test').Page,
  session: Session,
  selfId: string,
  flags: { startConfirmationOpen?: boolean; hostStartPendingOpen?: boolean } = {},
) {
  await page.evaluate(
    ({ session, song, selfId, flags }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({ ...(s as object), view: 'lobby', session, selfParticipantId: selfId, catalog: [song], wsClient, ...flags }));
    },
    { session, song, selfId, flags },
  );
}

function sentMessages(page: import('@playwright/test').Page): Promise<unknown[]> {
  return page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
}

// T005 (explicit-participant-readiness, ui.md Explicit Readiness & Start
// Negotiation): host confirmation modal + participant are-you-ready modal.

test('host modal: renders the not-ready count and Start anyway sends proceed:true', async ({ mount, page }) => {
  await mount(AppHarness);
  const { session, selfId } = makeSession(['loaded', 'loaded']);
  await setStore(page, session, selfId, { startConfirmationOpen: true });

  const dialog = page.getByRole('dialog', { name: 'Start anyway?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('2 participants are not yet ready');

  await dialog.getByRole('button', { name: 'Start anyway' }).click();
  expect(await sentMessages(page)).toContainEqual({ type: 'start-confirmation-answer', proceed: true });
  await expect(dialog).toHaveCount(0);
});

test('host modal: Cancel sends proceed:false and closes', async ({ mount, page }) => {
  await mount(AppHarness);
  const { session, selfId } = makeSession(['loaded']);
  await setStore(page, session, selfId, { startConfirmationOpen: true });

  const dialog = page.getByRole('dialog', { name: 'Start anyway?' });
  await expect(dialog).toContainText('1 participant is not yet ready');
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  expect(await sentMessages(page)).toContainEqual({ type: 'start-confirmation-answer', proceed: false });
  await expect(dialog).toHaveCount(0);
});

test('host modal: the count updates live as participants ready up', async ({ mount, page }) => {
  await mount(AppHarness);
  const { session, selfId } = makeSession(['loaded', 'loaded']);
  await setStore(page, session, selfId, { startConfirmationOpen: true });
  const dialog = page.getByRole('dialog', { name: 'Start anyway?' });
  await expect(dialog).toContainText('2 participants are not yet ready');

  // A session-state broadcast arrives with one member now ready.
  const updated = makeSession(['ready', 'loaded']);
  await setStore(page, updated.session, selfId);

  await expect(dialog).toContainText('1 participant is not yet ready');
});

test('host modal: Esc closes without sending any answer — the negotiation stays pending server-side', async ({ mount, page }) => {
  await mount(AppHarness);
  const { session, selfId } = makeSession(['loaded']);
  await setStore(page, session, selfId, { startConfirmationOpen: true });
  const dialog = page.getByRole('dialog', { name: 'Start anyway?' });
  await expect(dialog).toBeVisible();

  await page.locator('.modal-backdrop').first().focus();
  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCount(0);
  const sent = await sentMessages(page);
  expect(sent.filter((m) => (m as { type: string }).type === 'start-confirmation-answer')).toHaveLength(0);
});

test('participant modal: renders and I\'m ready sends ready-set true without self-dismissing', async ({ mount, page }) => {
  await mount(AppHarness);
  const { session } = makeSession(['loaded']);
  await setStore(page, session, 'm1', { hostStartPendingOpen: true });

  const dialog = page.getByRole('dialog', { name: 'Host wants to start' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Host wants to start, are you ready?');

  await dialog.getByRole('button', { name: "I'm ready" }).click();
  expect(await sentMessages(page)).toContainEqual({ type: 'ready-set', ready: true });
  // Stays open until host-start-resolved arrives (auto-dismiss below).
  await expect(dialog).toBeVisible();
});

for (const started of [true, false]) {
  test(`participant modal: auto-dismissed when host-start-resolved arrives (started: ${started})`, async ({ mount, page }) => {
    await mount(AppHarness);
    const { session } = makeSession(['loaded']);
    await setStore(page, session, 'm1', { hostStartPendingOpen: true });
    const dialog = page.getByRole('dialog', { name: 'Host wants to start' });
    await expect(dialog).toBeVisible();

    // ws-client maps host-start-resolved (either way) to this flag flip —
    // covered by ws-client.test.ts; here we assert the modal follows it.
    await setStore(page, session, 'm1', { hostStartPendingOpen: false });

    await expect(dialog).toHaveCount(0);
  });
}
