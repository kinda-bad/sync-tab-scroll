import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import LyricsOverlayHarness from './test-harness/LyricsOverlayHarness.svelte';

/**
 * Current-bar highlight in the in-tab ticker
 * (ui.md "Measure markers" / plan-lyrics-timing-repeats-2026-11-27-4c1e
 * Phase 5). Measures are in playback order: measure 2 is played twice
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

test("highlights the current bar's marker, following playback through a repeat", async ({ mount, page }) => {
  await mountWithMarkers(mount, page);
  const markers = page.locator('.lyrics-measure-marker');

  await expect(current(page)).toHaveCount(0); // nothing played yet

  await drive(page, 0);
  await expect(current(page)).toHaveCount(1);
  await expect(current(page)).toHaveText('1');

  await drive(page, 1500);
  await expect(current(page)).toHaveText('2');
  await expect(markers.nth(1)).toHaveClass(/lyrics-measure-marker--current/);

  await drive(page, 2500);
  await expect(current(page)).toHaveText('3');

  // Second pass of measure 2: its own (fourth) marker, not the first one.
  await drive(page, 3100);
  await expect(current(page)).toHaveCount(1);
  await expect(markers.nth(3)).toHaveClass(/lyrics-measure-marker--current/);
});

for (const theme of ['dark', 'light', 'cyberpunk-dark', 'cyberpunk-light']) {
  test(`current bar number uses the full-strength ink color, brighter than the other markers (${theme})`, async ({ mount, page }) => {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    await mountWithMarkers(mount, page);
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    await drive(page, 1500);

    const colors = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--ink)';
      document.body.appendChild(probe);
      const ink = getComputedStyle(probe).color;
      probe.remove();
      const cur = document.querySelector('.lyrics-measure-marker--current')!;
      const other = document.querySelector('.lyrics-measure-marker:not(.lyrics-measure-marker--current)')!;
      return {
        ink,
        current: getComputedStyle(cur.querySelector('.lyrics-measure-marker-number')!).color,
        currentOpacity: getComputedStyle(cur).opacity,
        other: getComputedStyle(other.querySelector('.lyrics-measure-marker-number')!).color,
      };
    });
    expect(colors.current).toBe(colors.ink);
    expect(colors.currentOpacity).toBe('1');
    expect(colors.other).not.toBe(colors.current);
  });
}
