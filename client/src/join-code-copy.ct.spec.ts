import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Session } from '@sync-tab-scroll/shared';
import AppHarness from './test-harness/AppHarness.svelte';

// T004 (feedback-join-code-click-to-copy-4971 F001): the Bar identity area's
// join-code chip is clickable, writes the code to the clipboard, and shows a
// transient inline confirmation.

function lobbySession(): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [
      { id: 'p1', displayName: 'Alice', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0, userId: null },
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
    ({ session }) => {
      const store = (window as unknown as { __clientStore: { update: (fn: (s: unknown) => unknown) => void } }).__clientStore;
      const wsClient = (window as unknown as { __wsClient: unknown }).__wsClient;
      store.update((s) => ({ ...(s as object), view: 'lobby', session, selfParticipantId: 'p1', catalog: [], wsClient }));
    },
    { session },
  );
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('join-code chip is clickable and writes the code to the clipboard', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, lobbySession());

  const chip = page.getByRole('button', { name: /Copy join code/ });
  await expect(chip).toBeVisible();
  await chip.click();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe('ABCD');
});

test('clicking the join-code chip shows a transient inline confirmation', async ({ mount, page }) => {
  await mount(AppHarness);
  await setStore(page, lobbySession());

  const chip = page.getByRole('button', { name: /Copy join code/ });
  await chip.click();

  await expect(page.getByText('Copied!')).toBeVisible();
});
