import { test, expect, type Page } from '@playwright/test';
import { createSessionAsHost, joinSessionAsMember, readStoredSession, sendAsParticipant } from './helpers';

/**
 * T019 (tasks-recording-drift-foundation-cc87). Everything Phase 1 measured
 * (T001-T005) was on one machine, one page, one shared AudioContext — this
 * is the first spec with two genuinely independent participants (separate
 * browser contexts), real WebSocket transport, and no shared audio stack.
 * Per infrastructure.md, in recording mode each side's `tickPosition`
 * tracks its own `HTMLAudioElement.currentTime` to ±5ms — that audio
 * element's `currentTime` is the ground-truth separation signal, read via
 * `__getPlaybackPositionForE2E` (a read-only test hook wired onto `window`
 * from main.ts; see its doc comment in playback-engine.ts).
 *
 * The 50ms bar (infra.md "Acceptance criterion") gates *end-state* (settled)
 * separation, not every instantaneous sample: the per-`play()` start skew
 * (~275-342ms, re-rolled on every start/seek, infra.md) is real and
 * characterized — each independent client transiently exceeds 50ms right
 * after a play/resume/seek before `correctDrift`'s periodic correction
 * converges it. Sampling immediately after a transport action would
 * mistake that known, already-accepted transient for a design failure.
 * This spec therefore samples only after each action has had time to
 * settle (a full periodic-broadcast cycle, ~1s, plus margin) — a full
 * play -> pause -> seek -> resume -> stop cycle, asserting settled
 * separation at each checkpoint.
 */

interface Position {
  tickPosition: number;
  audioCurrentTimeMs: number | null;
}

async function readPosition(page: Page): Promise<Position> {
  const pos = await page.evaluate(() => (window as unknown as { __getPlaybackPositionForE2E?: () => Position }).__getPlaybackPositionForE2E?.());
  if (!pos) throw new Error('__getPlaybackPositionForE2E returned nothing — engine not up yet');
  return pos;
}

async function settledSeparationMs(host: Page, member: Page): Promise<number> {
  // Post-settle: sample a few times and take the last — guards against a
  // single sample racing a correction broadcast mid-flight, without
  // masking a genuinely-unsettled state (each sample is still required to
  // exist and both audio elements to be present).
  let last = 0;
  for (let i = 0; i < 3; i++) {
    const [h, m] = await Promise.all([readPosition(host), readPosition(member)]);
    expect(h.audioCurrentTimeMs, 'host audio element present').not.toBeNull();
    expect(m.audioCurrentTimeMs, 'member audio element present').not.toBeNull();
    last = Math.abs((h.audioCurrentTimeMs ?? 0) - (m.audioCurrentTimeMs ?? 0));
    await host.waitForTimeout(150);
  }
  return last;
}

test('recording mode: two independent participants stay within the 50ms bar across play -> pause -> seek -> resume -> stop', async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);

  await createSessionAsHost(page, 'Host');
  await page.getByRole('listitem').filter({ hasText: 'Recording Aligned' }).getByRole('button', { name: 'Select' }).click();
  await page.getByRole('button', { name: 'Select' }).first().click(); // the only instrument part — auto-closes the modal

  // Host-only: switch the session's audio source to the real recording
  // (T012/T017) before anyone joins/readies up.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Session', exact: true }).click();
  await page.getByRole('button', { name: 'Recording' }).click();
  await expect(page.getByText('Everyone hears the real recording.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  const hostSession = await readStoredSession(page);

  const { context: memberContext, page: memberPage } = await joinSessionAsMember(browser, 'Member', hostSession.code);
  await memberPage.getByRole('button', { name: 'Select' }).first().click(); // same (only) instrument part

  await sendAsParticipant(hostSession, { type: 'readiness-update', readiness: 'ready' });
  const memberSession = await readStoredSession(memberPage);
  await sendAsParticipant(memberSession, { type: 'readiness-update', readiness: 'ready' });

  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(memberPage.locator('.playback-controls')).toBeVisible({ timeout: 10_000 });

  // --- play: sustain, then sample settled separation ---
  await page.waitForTimeout(2_500);
  const playSeparation = await settledSeparationMs(page, memberPage);
  console.log(`[T019] settled separation after play+sustain: ${playSeparation.toFixed(1)}ms`);
  expect(playSeparation).toBeLessThanOrEqual(50);

  // --- pause --- (Pause/Resume/Stop are host-only controls, App.svelte's
  // `{#if isHost}` — the member has no such buttons to assert on)
  await page.getByRole('button', { name: /Pause|Resume/ }).last().click();
  await expect(page.getByRole('button', { name: 'Resume' }).last()).toBeVisible({ timeout: 5_000 });

  // --- seek: host seeks via the real playback-control message (same
  // message debouncedSendSeek in playback-engine.ts sends off a real
  // canvas click — bypassing only the pixel-coordinate click itself, not
  // any server/client sync machinery) ---
  await sendAsParticipant(hostSession, { type: 'playback-control', action: 'seek', tickPosition: 8_000 });
  await page.waitForTimeout(500);

  // --- resume ---
  await page.getByRole('button', { name: 'Resume' }).last().click();
  await expect(page.getByRole('button', { name: 'Pause' }).last()).toBeVisible({ timeout: 5_000 });

  await page.waitForTimeout(2_500);
  const resumeSeparation = await settledSeparationMs(page, memberPage);
  console.log(`[T019] settled separation after seek+resume+sustain: ${resumeSeparation.toFixed(1)}ms`);
  expect(resumeSeparation).toBeLessThanOrEqual(50);

  // --- stop ---
  await page.getByRole('button', { name: 'Stop' }).last().click();
  await expect(page.locator('.playback-controls')).toHaveCount(0, { timeout: 10_000 });
  await expect(memberPage.locator('.playback-controls')).toHaveCount(0, { timeout: 10_000 });

  await memberContext.close();
});
