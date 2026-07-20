import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import RecordingDriftHarness from './test-harness/RecordingDriftHarness.svelte';

/**
 * T002 (tasks-sync-tabs-to-real-audio-cb85.md) — the diagnosis test.
 *
 * Mounts two real alphaTab instances against the T001 high-divergence
 * fixture (notated 120 bpm, recording 130 bpm, Δbpm = 10): a synth host and
 * a `PlayerMode.EnabledBackingTrack` participant, then drives the real
 * `correctDrift` against simulated `PlaybackState` broadcasts at the
 * production ~1/s cadence and counts how often a corrective seek actually
 * fires.
 *
 * A seek is an audible stutter in backing-track mode (it lands on the
 * `HTMLAudioElement` as a range request + re-buffer), so a healthy system
 * fires them rarely. The bar below — no more than one per 10 seconds of
 * playback — is the "not audibly stuttering" line.
 *
 * MEASURED BEFORE ANY FIX (20 s run, headless Chromium):
 *
 *   fixture             seeks   seeks/s   peak divergence
 *   recording-skewed    200     10.0      1279 ticks
 *   recording-aligned   200     10.0      1129 ticks
 *   synth control        12     ~0 steady-state (all 12 during startup)
 *
 * i.e. a seek on EVERY sampled store update, forever, in backing-track
 * mode — while the synth control settles to zero seeks after ~1.3 s.
 *
 * The free-running (correction disabled) runs isolate WHY, and show two
 * independent causes:
 *
 *  1. A constant ~160-tick (~83 ms at 120 bpm) offset: the backing-track
 *     instance's reported `tickPosition` sits persistently behind the
 *     synth host's. It is present at Δbpm = 0.5 just as much as at
 *     Δbpm = 10, so it is playback-latency/reporting granularity, NOT
 *     tempo divergence. On its own it exceeds `DRIFT_THRESHOLD_TICKS`
 *     (50) permanently, which is sufficient to explain a seek on every
 *     single update.
 *
 *  2. Genuine accumulating drift, at exactly the rate the plan predicted
 *     (Δbpm × 16 ticks/s), confirmed to three significant figures:
 *       Δbpm = 10  -> offset ran −200 -> +2514 ticks over 17 s (~160/s)
 *       Δbpm = 0.5 -> offset ran −520 -> −387 ticks over 17 s (~8/s)
 *     So alphaTab's sync points do NOT rate-normalise tick advance: a
 *     backing-track participant advances at the RECORDING's tempo.
 *
 * Cause 1 dominates and is Δbpm-independent; cause 2 is what T005's
 * musical margin has to bound.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(dir: string) {
  const root = path.resolve(__dirname, '../test-fixtures/fixture-catalog', dir);
  return {
    gp: fs.readFileSync(path.join(root, `${dir}.gp`)),
    mp3: fs.readFileSync(path.join(root, 'recording.mp3')),
    meta: JSON.parse(fs.readFileSync(path.join(root, 'meta.json'), 'utf8')),
  };
}

/** Long enough that startup seeks can't dominate the rate, short enough to stay inside the 32 s fixture. */
const RUN_MS = 20_000;
const MIN_SECONDS_PER_SEEK = 10;

test.fail();
test('a backing-track participant does not stutter-seek against a synth host', async ({ mount, page }) => {
  const { gp, mp3, meta } = loadFixture('recording-skewed');
  await page.route('**/fixture.gp', (r) => r.fulfill({ body: gp, contentType: 'application/octet-stream' }));
  await page.route('**/recording.mp3', (r) => r.fulfill({ body: mp3, contentType: 'audio/mpeg' }));

  const component = await mount(RecordingDriftHarness, {
    props: { gpFilePath: '/fixture.gp', recordingPath: '/recording.mp3', syncPoints: meta.syncPoints },
  });
  await expect(component.getByTestId('status')).toHaveText('ready', { timeout: 40_000 });

  const result = await page.evaluate(
    ([ms]) => (window as unknown as { __measureDrift: (ms: number) => Promise<Record<string, unknown>> }).__measureDrift(ms),
    [RUN_MS],
  );
  const { samples: _samples, ...summary } = result as Record<string, unknown>;
  console.log('[T002] backing-track drift summary', JSON.stringify(summary));

  expect(summary.errors).toEqual([]);
  expect(summary.secondsPerSeek as number).toBeGreaterThan(MIN_SECONDS_PER_SEEK);
});
