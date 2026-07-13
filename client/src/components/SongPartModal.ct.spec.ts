import { test, expect } from '@playwright/experimental-ct-svelte';
import SongPartModalHarness from '../test-harness/SongPartModalHarness.svelte';
import type { CatalogSong, Catalogue, Session } from '@sync-tab-scroll/shared';

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 },
    ],
    hostId: 'host-1',
    playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: 0 },
    countInEnabled: false,
    lobbyCursorTick: null,
    spotlightMode: false,
    pendingHostRequest: null,
    unlockedCatalogueIds: [],
    ...overrides,
  };
}

function song(id: string, catalogueId: string): CatalogSong {
  return {
    id,
    catalogueId,
    name: id,
    artist: 'Artist',
    gpFilePath: `/catalog/${id}/song.gp`,
    parts: [],
    lyricsLrc: null,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
  };
}

// A public "default" catalogue plus a locked private "Premium Pack": the
// server withholds the private catalogue's songs until unlocked, so `catalog`
// carries only the public song while `catalogues` still lists both.
const catalogues: Catalogue[] = [
  { id: 'default', name: 'default', public: true },
  { id: 'premium-pack', name: 'Premium Pack', public: false },
];
const catalog: CatalogSong[] = [song('creep', 'default')];

test("a public catalogue's songs render directly in the picker", async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  await expect(component.getByText('creep')).toBeVisible();
});

test('a locked private catalogue shows the locked indicator instead of a song list', async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  await expect(component.getByText('Premium Pack')).toBeVisible();
  await expect(component.getByTestId('locked-indicator')).toBeVisible();
  // The private catalogue's own song is not rendered (withheld until unlocked).
  await expect(component.getByText('bonus')).toHaveCount(0);
});

test('the host sees the "Enter activation key" control on a locked catalogue', async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  await expect(component.getByRole('button', { name: 'Enter activation key' })).toBeVisible();
});

test('a non-host participant sees the locked indicator but no unlock control', async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'member-1', catalog, catalogues },
  });

  await expect(component.getByTestId('locked-indicator')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Enter activation key' })).toHaveCount(0);
});

test('a member catalogue the signed-in host already unlocked lists its songs with no key prompt (T017)', async ({ mount }) => {
  // When the signed-in host is a member, the server auto-unlocks the private
  // catalogue (T014): its id is in unlockedCatalogueIds and its songs are
  // delivered. The picker must render it pre-unlocked — songs list directly, no
  // locked indicator, no "Enter activation key" control (ui.md).
  const unlocked = baseSession({ unlockedCatalogueIds: ['premium-pack'] });
  const fullCatalog: CatalogSong[] = [song('creep', 'default'), song('bonus', 'premium-pack')];

  const component = await mount(SongPartModalHarness, {
    props: { session: unlocked, selfParticipantId: 'host-1', catalog: fullCatalog, catalogues },
  });

  await expect(component.getByText('Premium Pack')).toBeVisible();
  await expect(component.getByText('bonus')).toBeVisible();
  await expect(component.getByTestId('locked-indicator')).toHaveCount(0);
  await expect(component.getByRole('button', { name: 'Enter activation key' })).toHaveCount(0);
});

test('submitting an activation key sends a catalogue-unlock message', async ({ mount, page }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  await component.getByRole('button', { name: 'Enter activation key' }).click();
  await component.getByPlaceholder('Enter activation key').fill('s3cr3t');
  await component.getByRole('button', { name: 'Unlock' }).click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'catalogue-unlock', catalogueId: 'premium-pack', key: 's3cr3t' });
});
