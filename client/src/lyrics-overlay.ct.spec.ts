import { test, expect } from '@playwright/experimental-ct-svelte';
import type { Page } from '@playwright/test';
import LyricsOverlayHarness from './test-harness/LyricsOverlayHarness.svelte';

function drive(page: Page, tick: number) {
  return page.evaluate((t) => (window as unknown as { __drive: (tick: number) => void }).__drive(t), tick);
}

test('highlights the correct syllable as tick position advances', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);

  const highlighted = () => page.locator('.lyric-syllable.at-highlight');

  await expect(highlighted()).toHaveCount(0);

  await drive(page, 0);
  await expect(highlighted()).toHaveText('When ');

  await drive(page, 150);
  await expect(highlighted()).toHaveText('you ');

  await drive(page, 250);
  // Between "were" (tick 200) and "here" (tick 400) — still on "were".
  await expect(highlighted()).toHaveText('were ');

  await drive(page, 400);
  await expect(highlighted()).toHaveText('here ');

  await drive(page, 999);
  await expect(highlighted()).toHaveText('before ');
});

test('overlays on top of the tab notation (viewport-fixed) instead of stacking below it', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);

  // Fixed, not absolute-within-container: .engine-containers spans the
  // entire (often multi-screen-tall) rendered score in the real app, so an
  // absolutely-positioned band anchored to its bottom would sit far below
  // the fold — verified live in a real browser, not just reasoned about.
  const overlayPosition = await page.locator('.lyrics-overlay').evaluate((el) => getComputedStyle(el).position);
  expect(overlayPosition).toBe('fixed');
});

test('centers the active syllable horizontally within the strip', async ({ mount, page }) => {
  await mount(LyricsOverlayHarness);

  await drive(page, 150); // activates "you"

  // .lyrics-track's transform is CSS-transitioned (motifs.css, 0.25s ease)
  // so the centered position isn't reflected in layout the instant the
  // style is set — wait for the transition to settle before measuring.
  await page.waitForTimeout(300);

  const activeBox = await page.locator('.lyric-syllable.at-highlight').boundingBox();
  const overlayBox = await page.locator('.lyrics-overlay').boundingBox();

  expect(activeBox).not.toBeNull();
  expect(overlayBox).not.toBeNull();

  const activeCenter = activeBox!.x + activeBox!.width / 2;
  const overlayCenter = overlayBox!.x + overlayBox!.width / 2;

  expect(Math.abs(activeCenter - overlayCenter)).toBeLessThanOrEqual(2);
});
