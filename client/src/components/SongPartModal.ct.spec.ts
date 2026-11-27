import { test, expect } from '@playwright/experimental-ct-svelte';
import SongPartModalHarness from '../test-harness/SongPartModalHarness.svelte';
import type { CatalogSong, Catalogue, Session } from '@sync-tab-scroll/shared';

function baseSession(overrides: Partial<Session> = {}): Session {
  return {
    code: 'ABCD',
    selectedSong: null,
    availableParts: [],
    participants: [
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 1 , userId: null},
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
    startMarkerBar: null,
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
    recordingPath: null,
    syncPoints: null,
  };
}

// The server now withholds a locked catalogue's metadata entirely
// (`visibleCatalog`, infrastructure.md), so a locked private "Premium Pack"
// never reaches the client: only the public "default" catalogue and its song
// are delivered. The client can't render — or even name — what it never sees.
const catalogues: Catalogue[] = [{ id: 'default', name: 'default', public: true }];
const catalog: CatalogSong[] = [song('creep', 'default')];

// Once unlocked, the server re-broadcasts a wider catalog that now includes the
// private catalogue's metadata and songs.
const unlockedCatalogues: Catalogue[] = [
  { id: 'default', name: 'default', public: true },
  { id: 'premium-pack', name: 'Premium Pack', public: false },
];
const unlockedCatalog: CatalogSong[] = [song('creep', 'default'), song('bonus', 'premium-pack')];

test("a public catalogue's songs render directly in the picker", async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  await expect(component.getByText('creep')).toBeVisible();
});

test('a locked private catalogue is absent from the picker entirely — no name, no locked indicator, no songs', async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  // The client never received the locked catalogue, so nothing about it renders.
  await expect(component.getByText('Premium Pack')).toHaveCount(0);
  await expect(component.getByText('bonus')).toHaveCount(0);
  await expect(component.getByTestId('locked-indicator')).toHaveCount(0);
});

test('the host sees a single standalone "Enter activation key" control', async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  // One persistent host-only control, not attached to any catalogue group.
  await expect(component.getByRole('button', { name: 'Enter activation key' })).toHaveCount(1);
});

test('a non-host participant sees no locked groups and no unlock control', async ({ mount }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'member-1', catalog, catalogues },
  });

  await expect(component.getByText('Premium Pack')).toHaveCount(0);
  await expect(component.getByRole('button', { name: 'Enter activation key' })).toHaveCount(0);
});

test('an unlocked private catalogue lists its group and songs, with no locked indicator', async ({ mount }) => {
  // After a successful unlock the server's wider catalog arrives: the private
  // catalogue's metadata and songs are now present, so its group appears.
  const unlocked = baseSession({ unlockedCatalogueIds: ['premium-pack'] });

  const component = await mount(SongPartModalHarness, {
    props: { session: unlocked, selfParticipantId: 'host-1', catalog: unlockedCatalog, catalogues: unlockedCatalogues },
  });

  await expect(component.getByText('Premium Pack')).toBeVisible();
  await expect(component.getByText('bonus')).toBeVisible();
  await expect(component.getByTestId('locked-indicator')).toHaveCount(0);
});

test('submitting an activation key sends a keyless catalogue-unlock message', async ({ mount, page }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession(), selfParticipantId: 'host-1', catalog, catalogues },
  });

  await component.getByRole('button', { name: 'Enter activation key' }).click();
  await component.getByPlaceholder('Enter activation key').fill('s3cr3t');
  await component.getByRole('button', { name: 'Unlock' }).click();

  const sent = await page.evaluate(() => (window as unknown as { __sentMessages: unknown[] }).__sentMessages);
  expect(sent).toContainEqual({ type: 'catalogue-unlock', key: 's3cr3t' });
});

// feedback-song-part-control-during-playb-dba8 F002: during playback, a
// different song needs a full stop and reset for everyone (song-select.ts
// stops playback), so the host confirms first. In the Lobby (stopped)
// Select still sends at once.
const twoSongs: CatalogSong[] = [song('creep', 'default'), song('bonus', 'default')];
const sentSongSelects = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __sentMessages: { type: string }[] }).__sentMessages.filter((m) => m.type === 'song-select'));

for (const status of ['running', 'paused'] as const) {
  test(`host choosing a different song while ${status}: confirm first, Cancel sends nothing`, async ({ mount, page }) => {
    const component = await mount(SongPartModalHarness, {
      props: {
        session: baseSession({ selectedSong: 'creep', playbackState: { status, tickPosition: 5000, bpm: 120, serverTimestamp: 0 } }),
        selfParticipantId: 'host-1',
        catalog: twoSongs,
        catalogues,
      },
    });

    await component.getByRole('button', { name: 'Change song' }).click();
    await component.getByRole('listitem').filter({ hasText: 'bonus' }).getByRole('button', { name: 'Select' }).click();

    await expect(component.getByText(/stops playback for everyone/)).toBeVisible();
    expect(await sentSongSelects(page)).toEqual([]);

    await component.getByRole('button', { name: 'Cancel' }).click();
    await expect(component.getByText(/stops playback for everyone/)).toHaveCount(0);
    expect(await sentSongSelects(page)).toEqual([]);
  });
}

test('host confirming a different song during playback sends song-select', async ({ mount, page }) => {
  const component = await mount(SongPartModalHarness, {
    props: {
      session: baseSession({ selectedSong: 'creep', playbackState: { status: 'paused', tickPosition: 5000, bpm: 120, serverTimestamp: 0 } }),
      selfParticipantId: 'host-1',
      catalog: twoSongs,
      catalogues,
    },
  });

  await component.getByRole('button', { name: 'Change song' }).click();
  await component.getByRole('listitem').filter({ hasText: 'bonus' }).getByRole('button', { name: 'Select' }).click();
  await page.evaluate(() => {
    (window as unknown as { __clientStore: { update: (fn: (s: object) => object) => void } }).__clientStore.update((s) => ({ ...s, playbackProgress: 0.6 }));
  });
  await component.getByRole('button', { name: 'Stop and switch' }).click();

  expect(await sentSongSelects(page)).toEqual([{ type: 'song-select', songId: 'bonus' }]);
  // Same reset as the bar's Stop: the hazard strip's progress goes back to 0.
  expect(
    await page.evaluate(() => {
      let p = -1;
      (window as unknown as { __clientStore: { subscribe: (fn: (s: { playbackProgress: number }) => void) => () => void } }).__clientStore.subscribe((s) => (p = s.playbackProgress))();
      return p;
    }),
  ).toBe(0);
});

test('re-selecting the current song during playback sends at once, with no warning (a server no-op)', async ({ mount, page }) => {
  const component = await mount(SongPartModalHarness, {
    props: {
      session: baseSession({ selectedSong: 'creep', playbackState: { status: 'paused', tickPosition: 5000, bpm: 120, serverTimestamp: 0 } }),
      selfParticipantId: 'host-1',
      catalog: twoSongs,
      catalogues,
    },
  });

  await component.getByRole('button', { name: 'Change song' }).click();
  await component.getByRole('listitem').filter({ hasText: 'creep' }).getByRole('button', { name: 'Select' }).click();

  await expect(component.getByText(/stops playback for everyone/)).toHaveCount(0);
  expect(await sentSongSelects(page)).toEqual([{ type: 'song-select', songId: 'creep' }]);
});

test('in the Lobby (stopped) a different song is selected at once, with no confirm', async ({ mount, page }) => {
  const component = await mount(SongPartModalHarness, {
    props: { session: baseSession({ selectedSong: 'creep' }), selfParticipantId: 'host-1', catalog: twoSongs, catalogues },
  });

  await component.getByRole('button', { name: 'Change song' }).click();
  await component.getByRole('listitem').filter({ hasText: 'bonus' }).getByRole('button', { name: 'Select' }).click();

  await expect(component.getByText(/stops playback for everyone/)).toHaveCount(0);
  expect(await sentSongSelects(page)).toEqual([{ type: 'song-select', songId: 'bonus' }]);
});
