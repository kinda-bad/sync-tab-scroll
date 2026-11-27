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
