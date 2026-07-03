import { test, expect } from '@playwright/experimental-ct-svelte';
import StoreHarness from './test-harness/StoreHarness.svelte';

test('a mounted component re-renders when clientStore.set is called', async ({ mount, page }) => {
  const component = await mount(StoreHarness);

  await expect(component.getByTestId('view')).toHaveText('landing');
  await expect(component.getByTestId('session-code')).toHaveText('');

  await page.evaluate(() => {
    (window as unknown as { __clientStore: { set: (s: unknown) => void } }).__clientStore.set({
      view: 'lobby',
      session: {
        code: 'ABCD',
        selectedSong: null,
        availableParts: [],
        participants: [],
        hostId: 'p1',
        playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
        countInEnabled: false,
        metronomeEnabled: false,
        lobbyCursorTick: null,
        spotlightMode: false,
      },
      selfParticipantId: 'p1',
      catalog: [],
      wsClient: null,
    });
  });

  await expect(component.getByTestId('view')).toHaveText('lobby');
  await expect(component.getByTestId('session-code')).toHaveText('ABCD');
});

test('a mounted component re-renders when clientStore.update is called', async ({ mount, page }) => {
  const component = await mount(StoreHarness);

  await page.evaluate(() => {
    (window as unknown as { __clientStore: { update: (fn: (s: { view: string }) => unknown) => void } }).__clientStore.update((s) => ({ ...s, view: 'playback' }));
  });

  await expect(component.getByTestId('view')).toHaveText('playback');
});
