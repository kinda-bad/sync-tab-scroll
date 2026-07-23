import { test, expect } from '@playwright/experimental-ct-svelte';
import SettingsModalHarness from './test-harness/SettingsModalHarness.svelte';
import type { CatalogSong, Session } from '@sync-tab-scroll/shared';

// T021 (feedback-recording-mode-metronome-lock-reconsidered-c415 F001): the
// personal Metronome preference toggle is no longer force-disabled while
// Session.playbackSource === 'recording' — it stays interactive and still
// drives the beat widget's visual component (metronomeStore, consumed by
// BeatWidget via App.svelte, untouched by this change).

function withParts(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: 'creep',
    availableParts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0, userId: null },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 1, userId: null },
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
    ...overrides,
  };
}

function recordingSong(): CatalogSong {
  return {
    id: 'creep',
    catalogueId: 'default',
    name: 'Creep',
    artist: 'Radiohead',
    gpFilePath: '/fixture.gp',
    parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    lyricsLrc: null,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
    recordingPath: '/fixture-recording.mp3',
    syncPoints: [{ barIndex: 0, barPosition: 0, barOccurence: 0, millisecondOffset: 0 }],
  };
}

test('Preferences tab: the Metronome toggle stays enabled and interactive during recording-mode playback', async ({ mount, page }) => {
  const component = await mount(SettingsModalHarness, {
    props: { session: withParts({ playbackSource: 'recording' }), selfParticipantId: 'member-1', catalog: [recordingSong()] },
  });
  await component.getByRole('button', { name: 'Preferences' }).click();

  const toggle = component.getByRole('button', { name: /Metronome:/ });
  await expect(toggle).toBeEnabled();

  await toggle.click();
  const stored = await page.evaluate(() => localStorage.getItem('sync-tab-scroll:metronome'));
  expect(stored).toBe('on');
});
