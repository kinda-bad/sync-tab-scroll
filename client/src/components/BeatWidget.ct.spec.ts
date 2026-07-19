import { test, expect } from '@playwright/experimental-ct-svelte';
import BeatWidgetHarness from '../test-harness/BeatWidgetHarness.svelte';

const Q = 960; // TICKS_PER_QUARTER_NOTE — literal here since CT props must be serializable anyway.
const fourFour = [
  { durationTicks: 4 * Q, numerator: 4 },
  { durationTicks: 4 * Q, numerator: 4 },
];

/**
 * Count-In & Metronome Beat Widget (ui.md; T007
 * tasks-widgets-gp5-songswitch-a046.md). Mode selection + gating matrix,
 * count values at known ticks (through the real beat-clock derivation via
 * the harness's fake score), and the render-nothing case.
 */
test.describe('gating matrix', () => {
  test('count-in phase with countInEnabled shows the countdown regardless of metronome pref', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'count-in', countInEnabled: true, metronomeOn: false, tick: 0, bars: fourFour, countInBeat: 1 },
    });
    await expect(component.getByTestId('beat-widget')).toBeVisible();
    await expect(component.getByTestId('beat-count')).toHaveText('4'); // counts DOWN: beat 1 of 4 -> shows 4
  });

  test('count-in phase with countInEnabled off renders nothing', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'count-in', countInEnabled: false, metronomeOn: true, tick: 0, bars: fourFour, countInBeat: 1 },
    });
    await expect(component.getByTestId('beat-widget')).toHaveCount(0);
  });

  test('playing phase with metronome pref on shows the count-up + measure label', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'playing', countInEnabled: false, metronomeOn: true, tick: Q, bars: fourFour },
    });
    await expect(component.getByTestId('beat-widget')).toBeVisible();
    await expect(component.getByTestId('beat-count')).toHaveText('2'); // counts UP: tick Q = beat 2
    await expect(component.getByTestId('beat-measure-number')).toHaveText('1');
  });

  test('playing phase with metronome pref off renders nothing (personal gate)', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'playing', countInEnabled: true, metronomeOn: false, tick: Q, bars: fourFour },
    });
    await expect(component.getByTestId('beat-widget')).toHaveCount(0);
  });

  test('idle phase renders nothing even with both gates on', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'idle', countInEnabled: true, metronomeOn: true, tick: 0, bars: fourFour },
    });
    await expect(component.getByTestId('beat-widget')).toHaveCount(0);
  });
});

test.describe('count values at known ticks', () => {
  test('rolls into measure 2 beat 1 at the bar boundary', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'playing', countInEnabled: false, metronomeOn: true, tick: 4 * Q, bars: fourFour },
    });
    await expect(component.getByTestId('beat-count')).toHaveText('1');
    await expect(component.getByTestId('beat-measure-number')).toHaveText('2');
  });

  test('counts to the actual numerator in a 3/4 bar (no hard-coded 4)', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'playing', countInEnabled: false, metronomeOn: true, tick: 2 * Q, bars: [{ durationTicks: 3 * Q, numerator: 3 }] },
    });
    await expect(component.getByTestId('beat-count')).toHaveText('3');
    // Fill parity/count derivation must be against beatCount 3.
    await expect(component.getByTestId('beat-widget')).toHaveAttribute('data-beat-total', '3');
  });

  test('count-in countdown in 3/4 counts down from 3', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'count-in', countInEnabled: true, metronomeOn: false, tick: 0, bars: [{ durationTicks: 3 * Q, numerator: 3 }], countInBeat: 2 },
    });
    await expect(component.getByTestId('beat-count')).toHaveText('2'); // beat 2 of 3 -> countdown shows 2
  });
});

// ---------------------------------------------------------------------------
// T007 (tasks-settings-ux-bundle-02e8.md, feedback beat-widget-layout
// F001/F002): the measure display renders to the LEFT of the beat count as
// a number stacked over a small "MES" caption (no "Measure 12" prose), and
// the beat count's horizontal position is identical in count-in mode
// (measure slot empty but space reserved) and playback mode (measure
// shown) — the countdown becomes the metronome without the number moving.
// ---------------------------------------------------------------------------

test.describe('measure-left-of-beat stacked layout (T007)', () => {
  test('playback mode: measure renders left of the beat count, as a number stacked over a "MES" caption', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'playing', countInEnabled: false, metronomeOn: true, tick: 4 * Q, bars: fourFour },
    });

    const slot = component.getByTestId('measure-slot');
    await expect(slot).toBeVisible({ timeout: 3000 });
    await expect(component.getByTestId('beat-measure-number')).toHaveText('2');
    await expect(component.getByTestId('beat-measure-caption')).toHaveText('MES');
    // No "Measure 12"-style prose anywhere.
    await expect(component.getByText(/Measure\s/)).toHaveCount(0);

    // The caption sits below the number (stacked), and the whole slot sits
    // left of the beat count.
    const slotBox = (await slot.boundingBox())!;
    const beatBox = (await component.getByTestId('beat-count').boundingBox())!;
    expect(slotBox.x + slotBox.width).toBeLessThanOrEqual(beatBox.x + 0.5);
    const numBox = (await component.getByTestId('beat-measure-number').boundingBox())!;
    const capBox = (await component.getByTestId('beat-measure-caption').boundingBox())!;
    expect(capBox.y).toBeGreaterThanOrEqual(numBox.y + numBox.height - 1);
  });

  test('count-in mode: the measure slot reserves its space but shows no measure number', async ({ mount }) => {
    const component = await mount(BeatWidgetHarness, {
      props: { phase: 'count-in', countInEnabled: true, metronomeOn: false, tick: 0, bars: fourFour, countInBeat: 1 },
    });

    const slot = component.getByTestId('measure-slot');
    await expect(slot).toHaveCount(1, { timeout: 3000 });
    // Space reserved: the slot occupies real width even with nothing shown.
    const slotBox = (await slot.boundingBox())!;
    expect(slotBox.width).toBeGreaterThan(0);
    // But no visible measure number/caption.
    await expect(component.getByTestId('beat-measure-number')).not.toBeVisible();
    await expect(component.getByTestId('beat-measure-caption')).not.toBeVisible();
  });

  test('the beat count does not move between count-in and playback modes', async ({ mount }) => {
    const countIn = await mount(BeatWidgetHarness, {
      props: { phase: 'count-in', countInEnabled: true, metronomeOn: true, tick: 0, bars: fourFour, countInBeat: 1 },
    });
    await expect(countIn.getByTestId('measure-slot')).toHaveCount(1, { timeout: 3000 });
    const countInBox = (await countIn.getByTestId('beat-count').boundingBox())!;
    await countIn.unmount();

    const playing = await mount(BeatWidgetHarness, {
      props: { phase: 'playing', countInEnabled: true, metronomeOn: true, tick: Q, bars: fourFour },
    });
    const playingBox = (await playing.getByTestId('beat-count').boundingBox())!;

    expect(Math.abs(playingBox.x - countInBox.x)).toBeLessThan(0.5);
  });
});
