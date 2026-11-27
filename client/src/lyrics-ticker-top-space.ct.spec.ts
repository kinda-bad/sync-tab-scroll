import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as at from '@coderline/alphatab';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

/**
 * Top-positioned lyrics ticker takes its own space (ui.md "Lyrics ticker
 * position"): the tab never starts behind it, and alphaTab's auto-scroll
 * brings the current bar's row in beneath it, not behind it. A long
 * generated score (64 bars, one sung syllable each) gives the page real
 * scroll room.
 */
const LONG_GP = (() => {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  const bars = Array.from({ length: 64 }, () => '0.4.4 0.4.4 0.4.4 0.4.4').join(' | ');
  const words = Array.from({ length: 64 * 4 }, (_, i) => `w${i + 1}`).join(' ');
  importer.initFromString(`\\tempo 240\n.\n\\track "Voice"\n\\lyrics "${words}"\n\\ts 4 4 ${bars}`, settings);
  return Buffer.from(new at.exporter.Gp7Exporter().export(importer.readScore(), settings));
})();

const BAR = 3840;

test.beforeEach(async ({ page }) => {
  await page.route('**/long.gp', (route) => route.fulfill({ body: LONG_GP, contentType: 'application/octet-stream' }));
});

async function mountTop(mount: (...args: never[]) => Promise<unknown>, page: Page, fontSize = 'medium') {
  // The CT page is already on the harness origin before mount (an init
  // script would only run on a later navigation).
  await page.evaluate((size) => {
    localStorage.setItem('sync-tab-scroll:lyrics-ticker-position', 'top');
    localStorage.setItem('sync-tab-scroll:lyrics-ticker-font-size', size);
  }, fontSize);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (mount as any)(PlaybackEngineHarness, {
    props: { gpFilePath: '/long.gp', trackIndex: 0, songOverrides: { lyricLineBreaks: [64 * 4] } },
  });
  await page.waitForSelector('.lyrics-overlay.lyrics-overlay--top', { timeout: 20_000, state: 'attached' });
  await page.waitForFunction(
    () => (window as unknown as { __getApi: () => { isReadyForPlayback: boolean } | undefined }).__getApi()?.isReadyForPlayback === true,
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForSelector('.at-surface svg', { timeout: 20_000 });
}

const tickerBottom = (page: Page) => page.locator('.lyrics-overlay').evaluate((el) => el.getBoundingClientRect().bottom);

/** Plays from `tick` until alphaTab's cursor follow has scrolled, then pauses. Returns the bar cursor's top in the viewport. */
async function playFromAndSettle(page: Page, tick: number): Promise<number> {
  await page.evaluate((t) => {
    const api = (window as unknown as { __getApi: () => at.AlphaTabApi }).__getApi();
    api.settings.player.nativeBrowserSmoothScroll = false;
    api.settings.player.scrollSpeed = 0;
    api.tickPosition = t;
    api.play();
  }, tick);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    (window as unknown as { __getApi: () => at.AlphaTabApi }).__getApi().pause();
    return document.querySelector('.at-cursor-bar')!.getBoundingClientRect().top;
  });
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`after an auto-scroll the current bar's row sits beneath the top ticker, not behind it (${viewport.name})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mountTop(mount, page);
    const cursorTop = await playFromAndSettle(page, 40 * BAR);
    expect(cursorTop).toBeGreaterThanOrEqual((await tickerBottom(page)) - 1);
  });
}

test('the first bar starts beneath the top ticker before playback', async ({ mount, page }) => {
  await mountTop(mount, page);
  const firstBar = page.locator('.at-surface svg').first();
  await expect.poll(async () => (await firstBar.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
  const cursorTop = await page.evaluate(() => document.querySelector('.at-cursor-bar')!.getBoundingClientRect().top);
  expect(cursorTop).toBeGreaterThanOrEqual((await tickerBottom(page)) - 1);
});

test('the reserved space follows the ticker height (huge font on desktop)', async ({ mount, page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mountTop(mount, page, 'huge');
  const overlay = page.locator('.lyrics-overlay');
  // The strip grows to fit the text rather than clipping it.
  const fits = await overlay.evaluate((el) => {
    const span = el.querySelector('.lyrics-track')!;
    const s = span.getBoundingClientRect();
    const o = el.getBoundingClientRect();
    return { ok: s.top >= o.top - 1 && s.bottom <= o.bottom + 1, s: [s.top, s.bottom], o: [o.top, o.bottom], fs: getComputedStyle(el).fontSize };
  });
  expect(fits.ok, JSON.stringify(fits)).toBe(true);
  const cursorTop = await playFromAndSettle(page, 40 * BAR);
  expect(cursorTop).toBeGreaterThanOrEqual((await tickerBottom(page)) - 1);
});
