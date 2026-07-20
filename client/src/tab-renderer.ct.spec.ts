import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import TabRendererHarness from './test-harness/TabRendererHarness.svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GP_PATH = path.resolve(__dirname, '../test-fixtures/synthetic-song.gp');
const gpBuffer = fs.readFileSync(GP_PATH);

const RECORDING_ROOT = path.resolve(__dirname, '../test-fixtures/fixture-catalog/recording-aligned');
const recordingGpBuffer = fs.readFileSync(path.join(RECORDING_ROOT, 'recording-aligned.gp'));
const recordingMp3Buffer = fs.readFileSync(path.join(RECORDING_ROOT, 'recording.mp3'));
const recordingSyncPoints = JSON.parse(fs.readFileSync(path.join(RECORDING_ROOT, 'meta.json'), 'utf8')).syncPoints;

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture.gp', (route) => route.fulfill({ body: gpBuffer, contentType: 'application/octet-stream' }));
});

test('renders real SVG output once the score loads', async ({ mount }) => {
  const component = await mount(TabRendererHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });

  await expect(component.locator('svg').first()).toBeVisible({ timeout: 20_000 });
});

test('setTheme visibly changes rendered resource colors', async ({ mount, page }) => {
  const component = await mount(TabRendererHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0, theme: 'dark' } });
  await expect(component.locator('svg').first()).toBeVisible({ timeout: 20_000 });

  const darkFill = await component.locator('svg text').first().evaluate((el) => getComputedStyle(el).fill);

  await page.evaluate(() => (window as unknown as { __setTheme: (t: string) => void }).__setTheme('light'));

  await expect.poll(async () => component.locator('svg text').first().evaluate((el) => getComputedStyle(el).fill)).not.toBe(darkFill);
});

test('the playback cursor is actually colored, not fully transparent', async ({ mount }) => {
  // alphaTab ships .at-cursor-bar/.at-cursor-beat/.at-selection with only
  // positioning inline styles — zero color/opacity of its own. Styling
  // them is the consuming app's job (brand.md designates --riot for
  // exactly this). Confirmed empirically this app never did.
  const component = await mount(TabRendererHarness, { props: { gpFilePath: '/fixture.gp', trackIndex: 0 } });
  await expect(component.locator('svg').first()).toBeVisible({ timeout: 20_000 });

  for (const selector of ['.at-cursor-bar', '.at-cursor-beat', '.at-selection']) {
    const backgroundColor = await component.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(backgroundColor, `${selector} should not be fully transparent`).not.toBe('rgba(0, 0, 0, 0)');
  }
});

test('recording mode renders the tab and attaches the backing track + sync points, without loading a sound font', async ({ mount, page }) => {
  await page.route('**/recording.gp', (route) => route.fulfill({ body: recordingGpBuffer, contentType: 'application/octet-stream' }));
  await page.route('**/recording.mp3', (route) => route.fulfill({ body: recordingMp3Buffer, contentType: 'audio/mpeg' }));

  const component = await mount(TabRendererHarness, {
    props: { gpFilePath: '/recording.gp', trackIndex: 0, recording: true, recordingPath: '/recording.mp3', syncPoints: recordingSyncPoints },
  });

  // Real notation still renders from the same GP file.
  await expect(component.locator('svg').first()).toBeVisible({ timeout: 20_000 });

  // The api is in backing-track mode, the mp3 is attached as the score's
  // backing track, and the sync points were applied to the master bars.
  const state = await page.evaluate(async () => {
    const api = (window as unknown as { __api: { settings: { player: { playerMode: number } }; score: { backingTrack?: { rawAudioFile?: Uint8Array }; masterBars: { syncPoints?: unknown[] }[] } | null } }).__api;
    // Poll briefly for the async score load to settle.
    for (let i = 0; i < 200 && !api.score; i++) await new Promise((r) => setTimeout(r, 50));
    const score = api.score!;
    const anchored = score.masterBars.some((mb) => (mb.syncPoints?.length ?? 0) > 0);
    return {
      playerMode: api.settings.player.playerMode,
      hasBackingAudio: (score.backingTrack?.rawAudioFile?.length ?? 0) > 0,
      anchored,
    };
  });

  // 3 === PlayerMode.EnabledBackingTrack in alphaTab 1.8.3.
  expect(state.playerMode).toBe(3);
  expect(state.hasBackingAudio).toBe(true);
  expect(state.anchored).toBe(true);
});
