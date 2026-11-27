import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import LyricsOverlayHarness from './test-harness/LyricsOverlayHarness.svelte';

/**
 * Lyrics ticker scroll modes (ui.md Settings › Lyrics, feature
 * lyrics-ticker-scroll-modes): an anchor (center, the default, or left) and
 * a scroll style (constant, the default; edge, which pages only near an
 * edge; or line, one lyric line at a time). The transform transition is
 * switched off so geometry can be read the moment a tick is driven.
 */

function drive(page: Page, tick: number) {
  return page.evaluate((t) => (window as unknown as { __drive: (tick: number) => void }).__drive(t), tick);
}

async function noTransitions(page: Page) {
  await page.addStyleTag({ content: '.lyrics-track { transition: none !important; }' });
}

/** Horizontal offset of an element's left edge or center from a fraction of the strip's width. */
function offsetFrom(page: Page, selector: string, edge: 'left' | 'center', fraction: number) {
  return page.evaluate(
    ({ selector, edge, fraction }) => {
      const el = document.querySelector(selector)!.getBoundingClientRect();
      const overlay = document.querySelector('.lyrics-overlay')!.getBoundingClientRect();
      const x = edge === 'left' ? el.left : el.left + el.width / 2;
      return x - (overlay.left + overlay.width * fraction);
    },
    { selector, edge, fraction },
  );
}

function trackShift(page: Page) {
  return page.locator('.lyrics-track').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
}

function visibleWords(page: Page) {
  return page
    .locator('.lyric-syllable:not(.lyrics-placeholder)')
    .evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent!.trim()));
}

// Forty short words, one every 100 ticks, in four ten-word lines: far wider
// than the strip, so edge mode has to page.
const LONG = Array.from({ length: 4 }, (_, line) =>
  Array.from({ length: 10 }, (_, i) => ({ text: `w${line * 10 + i}`, tickPosition: (line * 10 + i) * 100 })),
);
const LONG_MEASURES = Array.from({ length: 10 }, (_, i) => ({ tick: i * 400, number: i + 1 }));

test('left anchor: the highlighted syllable starts near the strip\'s left edge', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { anchor: 'left' } });
  await noTransitions(page);
  await drive(page, 150);
  expect(Math.abs(await offsetFrom(page, '.lyric-syllable.at-highlight', 'left', 0.15))).toBeLessThanOrEqual(2);
});

test('left anchor: the pre-singing placeholder sits at the anchor too', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { anchor: 'left' } });
  await noTransitions(page);
  await page.evaluate(() => (window as unknown as { __setAnchor: (a: string) => void }).__setAnchor('left'));
  expect(Math.abs(await offsetFrom(page, '.lyrics-placeholder', 'left', 0.15))).toBeLessThanOrEqual(2);
});

test('switching the anchor live re-anchors the current syllable', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);
  await noTransitions(page);
  await drive(page, 150);
  expect(Math.abs(await offsetFrom(page, '.lyric-syllable.at-highlight', 'center', 0.5))).toBeLessThanOrEqual(2);
  await page.evaluate(() => (window as unknown as { __setAnchor: (a: string) => void }).__setAnchor('left'));
  expect(Math.abs(await offsetFrom(page, '.lyric-syllable.at-highlight', 'left', 0.15))).toBeLessThanOrEqual(2);
});

test('edge scrolling holds the strip still until the highlight nears the right edge, then pages it to the anchor', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { lines: LONG, measures: [], anchor: 'left', scroll: 'edge' } });
  await noTransitions(page);
  await drive(page, 0);
  const start = await trackShift(page);

  let paged = -1;
  for (let i = 1; i < 40; i++) {
    await drive(page, i * 100);
    if ((await trackShift(page)) !== start) {
      paged = i;
      break;
    }
  }
  // It held still for several words, then paged…
  expect(paged).toBeGreaterThan(3);
  // …so the word that triggered it now sits at the left anchor.
  expect(Math.abs(await offsetFrom(page, '.lyric-syllable.at-highlight', 'left', 0.15))).toBeLessThanOrEqual(2);
  // And the word that paged it had been near the right edge, not mid-strip.
  const shift = start - (await trackShift(page));
  const overlayWidth = await page.locator('.lyrics-overlay').evaluate((el) => el.getBoundingClientRect().width);
  expect(shift).toBeGreaterThan(overlayWidth * 0.5);
});

test('edge scrolling still moves to an empty bar on entry, so the next words show', async ({ mount, page }) => {
  // Measure 2 (ticks 300-600) holds no syllable start.
  const lines = [
    [
      { text: 'a', tickPosition: 0 },
      { text: 'b', tickPosition: 100 },
    ],
    [{ text: 'c', tickPosition: 700 }],
  ];
  const measures = [
    { tick: 0, number: 1 },
    { tick: 300, number: 2 },
    { tick: 600, number: 3 },
  ];
  await mount(LyricsOverlayHarness, { props: { lines, measures, anchor: 'left', scroll: 'edge' } });
  await noTransitions(page);
  await drive(page, 100);
  await drive(page, 350);
  // The boundary before the next word ("c") sits at the anchor.
  const offset = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.lyric-syllable:not(.lyrics-placeholder)')];
    const next = spans.find((s) => s.textContent === 'c ')!.getBoundingClientRect();
    const overlay = document.querySelector('.lyrics-overlay')!.getBoundingClientRect();
    return next.left - (overlay.left + overlay.width * 0.15);
  });
  expect(Math.abs(offset)).toBeLessThanOrEqual(2);
});

test('line mode shows one lyric line at a time, switching when the next line starts', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { scroll: 'line' } });

  // Before singing: the placeholder, then the first line.
  await expect(page.locator('.lyrics-placeholder')).toBeVisible();
  expect(await visibleWords(page)).toEqual(['When', 'you', 'were']);

  await drive(page, 150);
  expect(await visibleWords(page)).toEqual(['When', 'you', 'were']);
  await expect(page.locator('.lyric-syllable.at-highlight')).toHaveText('you ');

  await drive(page, 400);
  expect(await visibleWords(page)).toEqual(['here', 'before']);
  await expect(page.locator('.lyric-syllable.at-highlight')).toHaveText('here ');
});

test('line mode shows the next line on entering an empty bar', async ({ mount, page }) => {
  const lines = [
    [
      { text: 'a', tickPosition: 0 },
      { text: 'b', tickPosition: 100 },
    ],
    [{ text: 'c', tickPosition: 700 }],
  ];
  const measures = [
    { tick: 0, number: 1 },
    { tick: 300, number: 2 },
    { tick: 600, number: 3 },
  ];
  await mount(LyricsOverlayHarness, { props: { lines, measures, scroll: 'line' } });
  await drive(page, 100);
  expect(await visibleWords(page)).toEqual(['a', 'b']);
  await drive(page, 350);
  expect(await visibleWords(page)).toEqual(['c']);
  // Nothing is highlighted until "c" starts (bar-line clearing).
  await expect(page.locator('.lyric-syllable.at-highlight')).toHaveCount(0);
  await drive(page, 700);
  await expect(page.locator('.lyric-syllable.at-highlight')).toHaveText('c ');
});

test('line mode: measure markers show only with their own line', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { scroll: 'line' } });
  await page.evaluate(() => (window as unknown as { __setMeasureMarkersVisible: (v: boolean) => void }).__setMeasureMarkersVisible(true));
  const shownMarkers = () =>
    page.locator('.lyrics-measure-marker').evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent));
  // Marker 1 sits before "When" (line 1); marker 2 before "here" (line 2).
  expect(await shownMarkers()).toEqual(['1']);
  await drive(page, 400);
  expect(await shownMarkers()).toEqual(['2']);
});

test('line mode: a long line wraps inside the strip instead of running off it', async ({ mount, page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  const wide = LONG.map((line) => line.map((s) => ({ ...s, text: `${s.text}-syllable` })));
  await mount(LyricsOverlayHarness, { props: { lines: wide, measures: LONG_MEASURES, scroll: 'line' } });
  await drive(page, 0);
  // Long enough that one row couldn't hold it.
  const rows = await page
    .locator('.lyric-syllable:not(.lyrics-placeholder)')
    .evaluateAll((els) => new Set(els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => Math.round(e.getBoundingClientRect().top))).size);
  expect(rows).toBeGreaterThan(1);
  const overflow = await page.evaluate(() => {
    const overlay = document.querySelector('.lyrics-overlay')!.getBoundingClientRect();
    return [...document.querySelectorAll('.lyric-syllable:not(.lyrics-placeholder)')]
      .filter((e) => getComputedStyle(e).display !== 'none')
      .some((e) => {
        const r = e.getBoundingClientRect();
        return r.left < overlay.left || r.right > overlay.right;
      });
  });
  expect(overflow).toBe(false);
});

test('switching scroll style live: line mode back to constant shows every word again, centered', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { scroll: 'line' } });
  await noTransitions(page);
  await drive(page, 150);
  await page.evaluate(() => (window as unknown as { __setScroll: (s: string) => void }).__setScroll('constant'));
  expect(await visibleWords(page)).toEqual(['When', 'you', 'were', 'here', 'before']);
  expect(Math.abs(await offsetFrom(page, '.lyric-syllable.at-highlight', 'center', 0.5))).toBeLessThanOrEqual(2);
});

test('line mode with the left anchor left-aligns the line', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { scroll: 'line', anchor: 'left' } });
  await drive(page, 0);
  const gap = await page.evaluate(() => {
    const first = [...document.querySelectorAll('.lyric-syllable')].find((e) => getComputedStyle(e).display !== 'none')!.getBoundingClientRect();
    const overlay = document.querySelector('.lyrics-overlay')!.getBoundingClientRect();
    return first.left - overlay.left;
  });
  // Just the strip's own padding.
  expect(gap).toBeLessThan(40);
});

test('the placeholder stays hidden after a seek back to before the first word, even across a mode change', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);
  await drive(page, 150);
  await drive(page, -50);
  await page.evaluate(() => (window as unknown as { __setScroll: (s: string) => void }).__setScroll('line'));
  await page.evaluate(() => (window as unknown as { __setMeasureMarkersVisible: (v: boolean) => void }).__setMeasureMarkersVisible(true));
  await expect(page.locator('.lyrics-placeholder')).toBeHidden();
});
