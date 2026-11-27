import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import LyricsOverlayHarness from './test-harness/LyricsOverlayHarness.svelte';

/**
 * Wordless-bar clearing in the in-tab ticker (ui.md "Measure markers" /
 * plan-lyrics-timing-repeats-2026-11-27-4c1e Phase 5). Measures are in playback order: measure 2 is played twice
 * (ticks 1000 and 3000), as `playbackMeasureBoundaries` gives it after a
 * repeat. Measure 3 holds no syllable start (a held note or rest only).
 */
const LINES = [
  [
    { text: 'one', tickPosition: 0 },
    { text: 'two', tickPosition: 500 },
  ],
  [{ text: 'three', tickPosition: 1000 }],
  [{ text: 'again', tickPosition: 3000 }],
];
const MEASURES = [
  { tick: 0, number: 1 },
  { tick: 1000, number: 2 },
  { tick: 2000, number: 3 },
  { tick: 3000, number: 2 },
];

function drive(page: Page, tick: number) {
  return page.evaluate((t) => (window as unknown as { __drive: (tick: number) => void }).__drive(t), tick);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mountWithMarkers(mount: any, page: Page) {
  await mount(LyricsOverlayHarness, { props: { lines: LINES, measures: MEASURES } });
  await page.evaluate(() =>
    (window as unknown as { __setMeasureMarkersVisible: (visible: boolean) => void }).__setMeasureMarkersVisible(true),
  );
}

const current = (page: Page) => page.locator('.lyrics-measure-marker--current');

test('clears the word highlight in a bar with no syllable start, and restores it on the next word', async ({ mount, page }) => {
  await mountWithMarkers(mount, page);
  const highlighted = page.locator('.lyric-syllable.at-highlight');

  await drive(page, 1200);
  await expect(highlighted).toHaveText('three ');

  // Measure 3 starts no syllable: "three" is no longer highlighted.
  await drive(page, 2100);
  await expect(highlighted).toHaveCount(0);
  await expect(current(page)).toHaveText('3');

  await drive(page, 3000);
  await expect(highlighted).toHaveText('again ');
});

test('keeps the word highlighted through a bar that starts a syllable later in the bar', async ({ mount, page }) => {
  await mountWithMarkers(mount, page);
  await drive(page, 600);
  await expect(page.locator('.lyric-syllable.at-highlight')).toHaveText('two ');
});

// User feedback 2026-11-27: clear at every bar boundary. Entering a bar whose
// first syllable starts later must not bring the previous bar's word back.
test('clears the word highlight at every bar line until the new bar\'s first syllable', async ({ mount, page }) => {
  const lines = [[{ text: 'one', tickPosition: 0 }], [{ text: 'late', tickPosition: 1500 }]];
  const measures = [
    { tick: 0, number: 1 },
    { tick: 1000, number: 2 },
  ];
  await mount(LyricsOverlayHarness, { props: { lines, measures } });
  const highlighted = page.locator('.lyric-syllable.at-highlight');

  await drive(page, 500);
  await expect(highlighted).toHaveText('one ');
  await drive(page, 1100);
  await expect(highlighted).toHaveCount(0);
  await drive(page, 1500);
  await expect(highlighted).toHaveText('late ');
});

// User feedback 2026-11-27: "the lyrics overlay should center empty measures
// when they are entered so we can see words coming after a long break".
// Entering a bar with no syllable start centers that bar (its marker when
// markers are shown, otherwise the boundary before the next word), so the
// next words sit just right of center instead of off the right edge.
const centerOf = (page: Page, selector: string, edge: 'center' | 'left') =>
  page.evaluate(
    ([sel, e]) => {
      const el = document.querySelector(sel)!.getBoundingClientRect();
      const overlay = document.querySelector('.lyrics-overlay')!.getBoundingClientRect();
      const x = e === 'left' ? el.left : el.left + el.width / 2;
      return x - (overlay.left + overlay.width / 2);
    },
    [selector, edge] as const,
  );

test('centers an empty bar on entry, with markers shown', async ({ mount, page }) => {
  await mountWithMarkers(mount, page);
  await drive(page, 1200);
  await drive(page, 2100);
  await page.waitForTimeout(400);
  const offset = await centerOf(page, '.lyrics-measure-marker--current', 'center');
  expect(Math.abs(offset)).toBeLessThanOrEqual(2);
});

test('centers the boundary before the next word in an empty bar, with markers hidden', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness, { props: { lines: LINES, measures: MEASURES } });
  await drive(page, 1200);
  await drive(page, 2100);
  await page.waitForTimeout(400);
  // The next word ("again") starts at the center line.
  const offset = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.lyric-syllable:not(.lyrics-placeholder)')];
    const next = spans.find((s) => s.textContent === 'again ')!.getBoundingClientRect();
    const overlay = document.querySelector('.lyrics-overlay')!.getBoundingClientRect();
    return next.left - (overlay.left + overlay.width / 2);
  });
  expect(Math.abs(offset)).toBeLessThanOrEqual(2);
  // And it recenters on that word once it's sung.
  await drive(page, 3000);
  await page.waitForTimeout(400);
  expect(Math.abs(await centerOf(page, '.lyric-syllable.at-highlight', 'center'))).toBeLessThanOrEqual(2);
});
