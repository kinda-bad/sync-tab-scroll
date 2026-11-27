import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import * as at from '@coderline/alphatab';
import PlaybackEngineHarness from './test-harness/PlaybackEngineHarness.svelte';

/**
 * The horizontal view (feature horizontal-scroll-view, ui.md Playback View
 * "Horizontal view"): one long staff scrolling right to left past a fixed
 * playhead, the lyrics in a band above it moving in step.
 */
const BAR = 3840;
const SYLLABLES = 32;

// 32 bars at 120bpm (2s a bar), one note per beat, and a made-up lyric of
// one syllable per beat for the first 8 bars ("la1 la2 …").
const LONG_GP = (() => {
  const settings = new at.Settings();
  const importer = new at.importer.AlphaTexImporter();
  const bars = Array.from({ length: 32 }, () => '0.4.4 2.4.4 3.4.4 5.4.4').join(' | ');
  const lyric = Array.from({ length: SYLLABLES }, (_, i) => `la${i + 1}`).join(' ');
  importer.initFromString(`\\tempo 120\n.\n\\track "Guitar"\n\\lyrics "${lyric}"\n\\ts 4 4 ${bars}`, settings);
  return Buffer.from(new at.exporter.Gp7Exporter().export(importer.readScore(), settings));
})();

type Win = { __getApi: () => at.AlphaTabApi };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.route('**/long.gp', (route) => route.fulfill({ body: LONG_GP, contentType: 'application/octet-stream' }));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mountHorizontal(mount: any, page: Page, props: Record<string, unknown> = {}) {
  const component = await mount(PlaybackEngineHarness, {
    props: {
      gpFilePath: '/long.gp',
      trackIndex: 0,
      horizontal: true,
      songOverrides: { lyricsTrackIndex: 0, lyricsLineIndex: 0, lyricLineBreaks: [SYLLABLES] },
      ...props,
    },
  });
  await page.waitForFunction(() => (window as unknown as Win).__getApi()?.isReadyForPlayback === true, undefined, { timeout: 20_000 });
  await page.waitForSelector('.at-surface svg', { timeout: 20_000 });
  await page.waitForTimeout(300);
  return component;
}

/** Screen x of the beat cursor (hidden in this view, but still placed by alphaTab) minus the playhead's. */
function cursorOffsetFromPlayhead(page: Page) {
  return page.evaluate(() => {
    const cursor = document.querySelector('.at-cursor-beat')!.getBoundingClientRect();
    const playhead = document.querySelector('.hview-playhead')!.getBoundingClientRect();
    return cursor.left - (playhead.left + playhead.width / 2);
  });
}

async function playUntil(page: Page, tick: number) {
  await page.evaluate(() => (window as unknown as Win).__getApi().play());
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__getApi().tickPosition), { timeout: 15_000 }).toBeGreaterThan(tick);
}

test('renders the tab as one long staff, even with a bars-per-row pin, without scrolling the page sideways', async ({ mount, page }) => {
  await mountHorizontal(mount, page, { barsPerRow: 2 });
  const layout = await page.evaluate(() => {
    const api = (window as unknown as Win).__getApi();
    const scroll = document.querySelector('.tab-scroll') as HTMLElement;
    return {
      layoutMode: api.settings.display.layoutMode,
      systems: api.boundsLookup!.staffSystems.length,
      sheetWider: scroll.scrollWidth > scroll.clientWidth * 3,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflowX: getComputedStyle(scroll).overflowX,
    };
  });
  expect(layout.layoutMode).toBe(at.LayoutMode.Horizontal);
  expect(layout.systems).toBe(1);
  expect(layout.sheetWider).toBe(true);
  expect(layout.pageOverflow).toBeLessThanOrEqual(0);
  expect(layout.overflowX).toBe('hidden');
});

test('parks the first beat under the playhead before playback starts', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await page.waitForTimeout(300);
  expect(Math.abs(await cursorOffsetFromPlayhead(page))).toBeLessThan(6);
});

test('while playing, the sheet moves under a fixed playhead: the cursor stays on it, the page never scrolls', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await playUntil(page, BAR);
  const offsets: number[] = [];
  for (let i = 0; i < 5; i++) {
    offsets.push(await cursorOffsetFromPlayhead(page));
    await page.waitForTimeout(250);
  }
  const scroll = await page.evaluate(() => ({
    left: (document.querySelector('.tab-scroll') as HTMLElement).scrollLeft,
    windowX: window.scrollX,
    windowY: window.scrollY,
  }));
  await page.evaluate(() => (window as unknown as Win).__getApi().pause());
  for (const offset of offsets) expect(Math.abs(offset)).toBeLessThan(40);
  expect(scroll.left).toBeGreaterThan(100);
  expect(scroll.windowX).toBe(0);
  expect(scroll.windowY).toBe(0);
});

test('scrolls smoothly: frame to frame the sheet only moves forward, in small steps', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await playUntil(page, BAR / 2);
  const samples = await page.evaluate(async () => {
    const scroll = document.querySelector('.tab-scroll') as HTMLElement;
    const lefts: number[] = [];
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const step = () => {
        lefts.push(scroll.scrollLeft);
        if (performance.now() - start < 1500) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    (window as unknown as Win).__getApi().pause();
    return lefts;
  });
  const steps = samples.slice(1).map((left, i) => left - samples[i]);
  expect(samples[samples.length - 1] - samples[0]).toBeGreaterThan(50);
  expect(Math.min(...steps)).toBeGreaterThanOrEqual(-1);
  expect(Math.max(...steps)).toBeLessThan(30);
});

test('a Start and a pause scroll the sheet sideways only (alphaTab 1.9.0 forceScrollTo axis bug)', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await playUntil(page, BAR * 2);
  await page.evaluate(() => (window as unknown as Win).__getApi().pause());
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    scrollTop: (document.querySelector('.tab-scroll') as HTMLElement).scrollTop,
    windowY: window.scrollY,
  }));
  expect(after.scrollTop).toBe(0);
  expect(after.windowY).toBe(0);
  expect(Math.abs(await cursorOffsetFromPlayhead(page))).toBeLessThan(6);
});

test('a seek while stopped (start marker, Spotlight, click) brings that beat to the playhead', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await page.evaluate((tick) => {
    (window as unknown as Win).__getApi().tickPosition = tick;
  }, BAR * 12);
  await expect.poll(() => cursorOffsetFromPlayhead(page).then(Math.abs), { timeout: 5_000 }).toBeLessThan(6);
  const left = await page.evaluate(() => (document.querySelector('.tab-scroll') as HTMLElement).scrollLeft);
  expect(left).toBeGreaterThan(500);
});

test('click-to-seek works on the one-line staff', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  const playhead = (await page.locator('.hview-playhead').boundingBox())!;
  const scroll = (await page.locator('.tab-scroll').boundingBox())!;
  // Some way to the right of the playhead, mid-staff: a later beat.
  const svgBox = (await page.locator('.at-surface svg').first().boundingBox())!;
  await page.mouse.click(playhead.x + 300, svgBox.y + svgBox.height * 0.6);
  await expect.poll(() => page.evaluate(() => (window as unknown as Win).__getApi().tickPosition), { timeout: 5_000 }).toBeGreaterThan(960);
  expect(scroll.width).toBeGreaterThan(0);
});

test('the lyrics band sits above the tab, about a third of the height, and each syllable reaches the playhead as it is sung', async ({
  mount,
  page,
}) => {
  await mountHorizontal(mount, page);
  const bands = await page.evaluate(() => {
    const lyrics = document.querySelector('.hview-lyrics')!.getBoundingClientRect();
    const tab = document.querySelector('.tab-band')!.getBoundingClientRect();
    return { lyricsTop: lyrics.top, lyricsBottom: lyrics.bottom, lyricsH: lyrics.height, tabTop: tab.top, tabH: tab.height };
  });
  expect(bands.lyricsBottom).toBeLessThanOrEqual(bands.tabTop + 1);
  expect(bands.lyricsH / (bands.lyricsH + bands.tabH)).toBeGreaterThan(0.28);
  expect(bands.lyricsH / (bands.lyricsH + bands.tabH)).toBeLessThan(0.38);
  // No in-tab ticker in this view.
  await expect(page.locator('.lyrics-overlay')).toHaveCount(0);
  await expect(page.locator('.hview-lyrics-item')).toHaveCount(SYLLABLES);

  await playUntil(page, BAR);
  for (let i = 0; i < 4; i++) {
    const check = await page.evaluate(() => {
      const playhead = document.querySelector('.hview-playhead')!.getBoundingClientRect();
      const x = playhead.left + playhead.width / 2;
      const items = Array.from(document.querySelectorAll('.hview-lyrics-item'));
      const active = items.findIndex((el) => el.classList.contains('at-highlight'));
      return {
        active,
        activeLeft: items[active]?.getBoundingClientRect().left ?? NaN,
        nextLeft: items[active + 1]?.getBoundingClientRect().left ?? NaN,
        x,
      };
    });
    expect(check.active).toBeGreaterThanOrEqual(0);
    expect(check.activeLeft).toBeLessThanOrEqual(check.x + 8);
    expect(check.nextLeft).toBeGreaterThan(check.x - 8);
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => (window as unknown as Win).__getApi().pause());
});

test('turning the view off rebuilds the engine in the paged layout with the ticker', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await page.evaluate(() => (window as unknown as { __switchHorizontal: (on: boolean) => void }).__switchHorizontal(false));
  await page.waitForFunction(() => (window as unknown as Win).__getApi()?.isReadyForPlayback === true, undefined, { timeout: 20_000 });
  await page.waitForSelector('.lyrics-overlay', { timeout: 20_000 });
  expect(await page.evaluate(() => (window as unknown as Win).__getApi().settings.display.layoutMode)).toBe(at.LayoutMode.Page);
  await expect(page.locator('.hview-lyrics')).toHaveCount(0);
});

test('the Lyrics part shows the same band alone, vertically centered, instead of the sheet', async ({ mount, page }) => {
  await mount(PlaybackEngineHarness, {
    props: {
      gpFilePath: '/long.gp',
      trackIndex: 0,
      horizontal: true,
      isLyricsPart: true,
      songOverrides: { lyricsTrackIndex: 0, lyricsLineIndex: 0, lyricLineBreaks: [SYLLABLES] },
    },
  });
  await page.waitForFunction(() => (window as unknown as Win).__getApi()?.isReadyForPlayback === true, undefined, { timeout: 20_000 });
  await expect(page.locator('.full-lyrics-view .hview-lyrics-item')).toHaveCount(SYLLABLES, { timeout: 10_000 });
  await expect(page.locator('.full-lyrics-view .lyric-line')).toHaveCount(0);
  const centers = await page.evaluate(() => {
    const view = document.querySelector('.full-lyrics-view')!.getBoundingClientRect();
    const band = document.querySelector('.full-lyrics-view .hview-lyrics')!.getBoundingClientRect();
    return { view: view.top + view.height / 2, band: band.top + band.height / 2, bandH: band.height, viewH: view.height };
  });
  expect(Math.abs(centers.view - centers.band)).toBeLessThan(4);
  expect(centers.bandH).toBeGreaterThan(centers.viewH * 0.4);
});

test('on a short landscape phone the staff shrinks to fit the tab band, so it never scrolls up and down', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const scroll = document.querySelector('.tab-scroll') as HTMLElement;
          return (document.querySelector('.at-surface') as HTMLElement).offsetHeight - scroll.clientHeight;
        }),
      { timeout: 10_000 },
    )
    .toBeLessThanOrEqual(0);
});

test('the early-stop point dims the sheet from the stop beat onward, and clearing it removes the dim', async ({ mount, page }) => {
  await mountHorizontal(mount, page);
  await page.evaluate((tick) => (window as unknown as { __setEarlyStop: (t: number | null) => void }).__setEarlyStop(tick), BAR * 2);
  const geometry = await page.evaluate((tick) => {
    const api = (window as unknown as Win).__getApi();
    const beat = api.tickCache!.findBeat(new Set([0]), tick)!.beat;
    const beatX = api.boundsLookup!.findBeat(beat)!.onNotesX;
    const surface = document.querySelector('.at-surface')!.getBoundingClientRect();
    const scrim = document.querySelector('.hview-early-stop')!.getBoundingClientRect();
    return { scrimLeft: scrim.left, beatLeft: surface.left + beatX };
  }, BAR * 2);
  expect(Math.abs(geometry.scrimLeft - geometry.beatLeft)).toBeLessThan(2);
  await page.evaluate(() => (window as unknown as { __setEarlyStop: (t: number | null) => void }).__setEarlyStop(null));
  await expect(page.locator('.hview-early-stop')).toHaveCount(0);
});
