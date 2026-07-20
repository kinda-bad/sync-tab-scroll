import { test, expect } from '@playwright/experimental-ct-svelte';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import RecordingDriftHarness from './test-harness/RecordingDriftHarness.svelte';

/**
 * T002 (tasks-recording-drift-foundation-cc87.md) — the uniform-source gate.
 *
 * Two real alphaTab instances, BOTH on the same recording (a backing-track
 * host driving a backing-track participant — the exact configuration the
 * plan depends on and which had never been exercised). Because each side's
 * reported `tickPosition` tracks its own `HTMLAudioElement.currentTime` to
 * ±5ms (T004a), aligning the two reported positions is the same as aligning
 * the two audios (research-recording-mode-drift §2, assumption A1). So a
 * millisecond separation bar is genuinely assertable here, unlike the mixed
 * synth/recording direction.
 *
 * Gate: end-state separation <= 50ms across a full play -> sustain(>=20s)
 * -> seek -> resume cycle, on the `recording-aligned` fixture (Δbpm = 0.5).
 * Separation is asserted in MILLISECONDS (ticks mislead across tempos);
 * seek count is recorded only as a secondary observation (feedback F007).
 *
 * Held RED first (constitution Principle VII) with a `test.fail()` marker
 * while the per-play() start skew and notated-vs-recording projection rate
 * were unaddressed (measured audible separation 82ms). T004 removed the
 * marker: a backing-track participant now free-runs its own ground-truth
 * audio instead of seek-chasing the host's projection (which injected the
 * separation during the host's start-skew window), so the uniform pair holds
 * the bar with ~0ms separation.
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

const SEPARATION_BAR_MS = 50;

test('a backing-track host and participant finish within 50ms on the aligned recording', async ({ mount, page }) => {
  const { gp, mp3, meta } = loadFixture('recording-aligned');
  await page.route('**/fixture.gp', (r) => r.fulfill({ body: gp, contentType: 'application/octet-stream' }));
  await page.route('**/recording.mp3', (r) => r.fulfill({ body: mp3, contentType: 'audio/mpeg' }));

  const component = await mount(RecordingDriftHarness, {
    props: { gpFilePath: '/fixture.gp', recordingPath: '/recording.mp3', syncPoints: meta.syncPoints, hostBacking: true },
  });
  await expect(component.getByTestId('status')).toHaveText('ready', { timeout: 40_000 });

  const result = (await page.evaluate(
    () => (window as unknown as { __measureUniform: (o: unknown) => Promise<Record<string, unknown>> }).__measureUniform({ sustainMs: 20_000, resumeMs: 8_000, seekTick: 20_000, correct: true }),
  )) as Record<string, unknown>;

  const { samples: _samples, ...summary } = result;
  console.log('[T002] uniform backing/backing summary', JSON.stringify(summary));

  expect(summary.errors).toEqual([]);
  const reportedSepMs = summary.endReportedSepMs as number;
  const audioSepMs = summary.endAudioSepMs as number | null;
  expect(reportedSepMs).toBeLessThanOrEqual(SEPARATION_BAR_MS);
  if (audioSepMs !== null) expect(audioSepMs).toBeLessThanOrEqual(SEPARATION_BAR_MS);
});
