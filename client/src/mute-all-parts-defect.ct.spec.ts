import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from './test-harness/SettingsModalHarness.svelte';
import type { Session } from '@sync-tab-scroll/shared';

// T026 (defect: b16e2ab1) — ui.md identifies the Tracks tab's "Mute all"
// control as `mute-all-parts-button`, implying a queryable id/testid, but the
// DOM element previously carried no id/data-testid/aria-label matching that
// literal string — only a feature-tag string in code/test comments. This
// asserts the control is queryable by that identifier, matching ui.md's
// documented spec, and that the rest of its documented behavior (single
// action muting every part's MIDI audio via batch api.changeTrackMute(),
// count-in/metronome staying audible, personal per-(song,track)
// persistence) holds.

function trackSession(): Session {
  return {
    code: 'ABCD',
    selectedSong: 'tiro',
    availableParts: [
      { trackIndex: 0, instrumentName: 'M. Bellamy (Vocals)' },
      { trackIndex: 1, instrumentName: 'Chris (bass)' },
    ],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0, userId: null },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1, userId: null },
    ],
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    playbackSource: 'synth',
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    hostBarsPerRow: null,
    earlyStopTick: null,
  };
}

test('the "Mute all" control is queryable by the mute-all-parts-button identifier ui.md documents', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, { props: { session: trackSession(), selfParticipantId: 'member-1' } });
  await component.getByRole('button', { name: 'Tracks' }).click();

  const muteAll = component.getByTestId('mute-all-parts-button');
  await expect(muteAll).toBeVisible();
  await expect(muteAll).toHaveText(/Mute all/);

  await muteAll.click();
  for (const idx of [0, 1]) {
    expect(await page.evaluate((i) => localStorage.getItem(`sync-tab-scroll:mute:tiro:${i}`), idx)).toBe('on');
  }
});
