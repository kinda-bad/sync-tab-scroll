import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from '../test-harness/SettingsModalHarness.svelte';

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [],
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    metronomeEnabled: false,
    lobbyCursorTick: null,
    spotlightMode: false,
    ...overrides,
  };
}

async function setState(page: import('@playwright/test').Page, session: unknown, selfParticipantId: string) {
  await page.evaluate(
    ({ session, selfParticipantId }) => {
      const w = window as unknown as { __clientStore: { set: (s: unknown) => void }; __fakeWsClient: unknown };
      w.__clientStore.set({
        view: 'lobby',
        session,
        selfParticipantId,
        catalog: [],
        wsClient: w.__fakeWsClient,
        playbackProgress: 0,
      });
    },
    { session, selfParticipantId },
  );
}

test('Metronome/Count-in buttons render only for the host', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness);

  await setState(page, baseSession(), 'member-1');
  await expect(component.getByText('Metronome:')).toHaveCount(0);
  await expect(component.getByText('Count-in:')).toHaveCount(0);

  await setState(page, baseSession(), 'host-1');
  await expect(component.getByText(/Metronome:/)).toBeVisible();
  await expect(component.getByText(/Count-in:/)).toBeVisible();
});

test('button label/variant reflects metronomeEnabled/countInEnabled', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness);

  await setState(page, baseSession({ metronomeEnabled: false, countInEnabled: true }), 'host-1');

  await expect(component.getByText('Metronome: Off')).toBeVisible();
  await expect(component.getByText('Count-in: On')).toBeVisible();
});

test('clicking Metronome sends metronome-set with the flipped value', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness);
  await setState(page, baseSession({ metronomeEnabled: false }), 'host-1');

  await component.getByText('Metronome: Off').click();

  const sent = await page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent);
  expect(sent).toContainEqual({ type: 'metronome-set', enabled: true });
});

test('clicking Count-in sends count-in-set with the flipped value', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness);
  await setState(page, baseSession({ countInEnabled: true }), 'host-1');

  await component.getByText('Count-in: On').click();

  const sent = await page.evaluate(() => (window as unknown as { __sent: unknown[] }).__sent);
  expect(sent).toContainEqual({ type: 'count-in-set', enabled: false });
});
