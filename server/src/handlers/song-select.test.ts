import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { CatalogSong, Catalogue } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleSongSelect } from './song-select.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function fakeSong(id: string, catalogueId = 'default'): CatalogSong {
  return {
    id,
    catalogueId,
    name: id,
    artist: 'Artist',
    gpFilePath: `/catalog/${id}/song.gp`,
    parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    lyricsLrc: null,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
    recordingPath: null,
    syncPoints: null,
  };
}

function makeCtx(songs: CatalogSong[], catalogues: Catalogue[] = []) {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues, songs } } satisfies HandlerContext;
}

describe('song-select', () => {
  it('rejects a non-host', () => {
    const ctx = makeCtx([fakeSong('creep')]);
    const session = ctx.sessionStore.create('host-1');
    const memberSocket = fakeSocket();
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleSongSelect(ctx, memberSocket, { type: 'song-select', songId: 'creep' });

    expect(session.selectedSong).toBeNull();
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can select a song' }]);
  });

  it('sends an error for a nonexistent song id', () => {
    const ctx = makeCtx([fakeSong('creep')]);
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'nope' });

    expect(sent).toEqual([{ type: 'error', message: 'Song nope not found' }]);
  });

  it('sets selectedSong/availableParts and resets every participant part/readiness on a genuine change', () => {
    const ctx = makeCtx([fakeSong('creep')]);
    const session = ctx.sessionStore.create('host-1');
    session.participants.push(
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 5, readiness: 'ready', joinedAt: 0 , userId: null},
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 'lyrics', readiness: 'ready', joinedAt: 1 , userId: null},
    );
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.selectedSong).toBe('creep');
    expect(session.availableParts).toEqual([{ instrumentName: 'Guitar', trackIndex: 0 }]);
    for (const p of session.participants) {
      expect(p.selectedPart).toBeNull();
      expect(p.readiness).toBe('no-part');
    }
  });

  it('does not reset parts/readiness when re-selecting the already-selected song', () => {
    const ctx = makeCtx([fakeSong('creep')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 'creep';
    session.availableParts = [{ instrumentName: 'Guitar', trackIndex: 0 }];
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0 , userId: null});
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.participants[0].selectedPart).toBe(0);
    expect(session.participants[0].readiness).toBe('ready');
  });

  // T010: Session.hostBarsPerRow defaults to null and resets to null on song
  // change (following the existing spotlightMode/lobbyCursorTick reset
  // pattern above).
  it('T010: hostBarsPerRow defaults to null and resets to null on a genuine song change', () => {
    const ctx = makeCtx([fakeSong('creep'), fakeSong('bonus')]);
    const session = ctx.sessionStore.create('host-1');
    expect(session.hostBarsPerRow).toBeNull();
    session.selectedSong = 'bonus';
    session.hostBarsPerRow = 4;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.hostBarsPerRow).toBeNull();
  });

  // T015: Session.earlyStopTick mirrors the same default-null/reset-on-
  // song-change pattern.
  it('T015: earlyStopTick defaults to null and resets to null on a genuine song change', () => {
    const ctx = makeCtx([fakeSong('creep'), fakeSong('bonus')]);
    const session = ctx.sessionStore.create('host-1');
    expect(session.earlyStopTick).toBeNull();
    session.selectedSong = 'bonus';
    session.earlyStopTick = 1000;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.earlyStopTick).toBeNull();
  });

  // per-song-default-start-point: the start position is per-song. Without a
  // reset, a position seeded (or clicked) on the previous song would carry
  // over, and the new song would start mid-way at a meaningless tick.
  it('resets playbackState.tickPosition to 0 on a genuine song change', () => {
    const ctx = makeCtx([fakeSong('creep'), fakeSong('bonus')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 'bonus';
    session.playbackState.tickPosition = 30720;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.playbackState.tickPosition).toBe(0);
  });

  // feedback-song-part-control-during-playb-dba8 F002: a different song is a
  // full stop for everyone (nothing of the old song's position carries
  // over), even when sent while playback is running or paused, so every
  // client returns to the Lobby (ws-client.ts keys that off 'stopped').
  for (const status of ['running', 'paused'] as const) {
    it(`stops playback when a different song is selected while ${status}`, () => {
      const ctx = makeCtx([fakeSong('creep'), fakeSong('bonus')]);
      const session = ctx.sessionStore.create('host-1');
      session.selectedSong = 'bonus';
      session.playbackState.status = status;
      session.playbackState.tickPosition = 30720;
      const hostSocket = fakeSocket();
      ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
      ctx.connections.broadcast = () => {};

      handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

      expect(session.playbackState.status).toBe('stopped');
      expect(session.playbackState.tickPosition).toBe(0);
    });
  }

  it('leaves running playback alone when re-selecting the same song', () => {
    const ctx = makeCtx([fakeSong('creep')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 'creep';
    session.playbackState.status = 'running';
    session.playbackState.tickPosition = 30720;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.playbackState.status).toBe('running');
    expect(session.playbackState.tickPosition).toBe(30720);
  });

  // The start marker is seeded from the newly selected song's own
  // defaultStartBar on a genuine change (null when it has none), and a
  // same-song re-select leaves it alone — including a marker the host
  // cleared, which stays cleared until another song is picked.
  it('seeds startMarkerBar from the new song defaultStartBar on a genuine song change', () => {
    const ctx = makeCtx([{ ...fakeSong('sp-1979'), defaultStartBar: 9 }, fakeSong('creep')]);
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'sp-1979' });
    expect(session.startMarkerBar).toBe(9);

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });
    expect(session.startMarkerBar).toBeNull();
  });

  it('does not re-seed a cleared start marker when re-selecting the same song', () => {
    const ctx = makeCtx([{ ...fakeSong('sp-1979'), defaultStartBar: 9 }]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 'sp-1979';
    session.startMarkerBar = null; // host cleared it
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'sp-1979' });

    expect(session.startMarkerBar).toBeNull();
  });

  it('leaves playbackState.tickPosition alone when re-selecting the same song', () => {
    const ctx = makeCtx([fakeSong('creep')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 'creep';
    session.playbackState.tickPosition = 30720;
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.playbackState.tickPosition).toBe(30720);
  });
});

describe('song-select catalogue-unlock guard', () => {
  const catalogues: Catalogue[] = [
    { id: 'default', name: 'default', public: true },
    { id: 'premium-pack', name: 'Premium Pack', public: false },
  ];

  function hostCtx() {
    const ctx = makeCtx([fakeSong('creep', 'default'), fakeSong('bonus', 'premium-pack')], catalogues);
    const session = ctx.sessionStore.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    const sent: unknown[] = [];
    ctx.connections.send = (_socket, message) => sent.push(message);
    let broadcasts = 0;
    ctx.connections.broadcast = () => {
      broadcasts++;
    };
    return { ctx, session, hostSocket, sent, broadcasts: () => broadcasts };
  }

  it('rejects selecting a song from a locked private catalogue, leaving selectedSong unchanged', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = hostCtx();

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'bonus' });

    expect(session.selectedSong).toBeNull();
    expect(broadcasts()).toBe(0);
    // Same error the invalid-id path sends — "locked" is indistinguishable from "nonexistent".
    expect(sent).toEqual([{ type: 'error', message: 'Song bonus not found' }]);
  });

  it('allows selecting the same song once its catalogue is unlocked', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = hostCtx();
    session.unlockedCatalogueIds.push('premium-pack');

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'bonus' });

    expect(session.selectedSong).toBe('bonus');
    expect(sent).toEqual([]);
    expect(broadcasts()).toBe(1);
  });

  it('still allows selecting a public/default-catalogue song', () => {
    const { ctx, session, hostSocket, sent, broadcasts } = hostCtx();

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.selectedSong).toBe('creep');
    expect(sent).toEqual([]);
    expect(broadcasts()).toBe(1);
  });
});
