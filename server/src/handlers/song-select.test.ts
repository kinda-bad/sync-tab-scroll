import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import type { CatalogSong } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handleSongSelect } from './song-select.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function fakeSong(id: string): CatalogSong {
  return {
    id,
    name: id,
    artist: 'Artist',
    gpFilePath: `/catalog/${id}/song.gp`,
    parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    lyricsLrc: null,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
  };
}

function makeCtx(catalog: CatalogSong[]) {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), catalog } satisfies HandlerContext;
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
      { id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 5, readiness: 'ready', joinedAt: 0 },
      { id: 'member-1', displayName: 'Member', role: 'member', connectionStatus: 'connected', selectedPart: 'lyrics', readiness: 'ready', joinedAt: 1 },
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
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: 0, readiness: 'ready', joinedAt: 0 });
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 'creep' });

    expect(session.participants[0].selectedPart).toBe(0);
    expect(session.participants[0].readiness).toBe('ready');
  });
});
