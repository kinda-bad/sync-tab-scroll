import { describe, expect, it } from 'vitest';
import { NullAccountStore } from '../accounts/null-store.js';
import type { WebSocket } from 'ws';
import type { CatalogSong, ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from '../session-store.js';
import { ConnectionRegistry } from '../connections.js';
import type { HandlerContext } from './context.js';
import { handlePlaybackSourceSet } from './playback-source-set.js';
import { handleSongSelect } from './song-select.js';

function fakeSocket(): WebSocket {
  return { send: () => {} } as unknown as WebSocket;
}

function recordingSong(id: string): CatalogSong {
  return {
    id,
    catalogueId: 'default',
    name: id,
    artist: 'A',
    gpFilePath: `/catalog/${id}/song.gp`,
    parts: [{ instrumentName: 'Guitar', trackIndex: 0 }],
    lyricsLrc: null,
    lyricsTrackIndex: null,
    lyricsLineIndex: null,
    lyricLineBreaks: null,
    recordingPath: `/catalog/${id}/recording.mp3`,
    syncPoints: [],
  };
}

function synthSong(id: string): CatalogSong {
  return { ...recordingSong(id), recordingPath: null, syncPoints: null };
}

function makeCtx(songs: CatalogSong[] = []) {
  return { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: { catalogues: [], songs } } satisfies HandlerContext;
}

describe('playback-source-set', () => {
  it('rejects a non-host and leaves playbackSource unchanged', () => {
    const ctx = makeCtx([recordingSong('s1')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    const hostSocket = fakeSocket();
    const memberSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.attach(memberSocket, { sessionCode: session.code, participantId: 'member-1' });

    const sent: ServerMessage[] = [];
    ctx.connections.send = (_socket, message) => { sent.push(message); };

    handlePlaybackSourceSet(ctx, memberSocket, { type: 'playback-source-set', source: 'recording' });

    expect(session.playbackSource).toBe('synth');
    expect(sent).toEqual([{ type: 'error', message: 'Only the host can control the audio source' }]);
  });

  it('rejects the switch while playback is running', () => {
    const ctx = makeCtx([recordingSong('s1')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    session.playbackState.status = 'running';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const sent: ServerMessage[] = [];
    ctx.connections.send = (_socket, message) => { sent.push(message); };

    handlePlaybackSourceSet(ctx, hostSocket, { type: 'playback-source-set', source: 'recording' });

    expect(session.playbackSource).toBe('synth');
    expect(sent).toEqual([{ type: 'error', message: 'Cannot change the audio source while playback is running' }]);
  });

  it('lets the host switch to recording for a recording-capable song and broadcasts', () => {
    const ctx = makeCtx([recordingSong('s1')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, buildMessage) => { broadcasts.push(buildMessage('host-1')); };

    handlePlaybackSourceSet(ctx, hostSocket, { type: 'playback-source-set', source: 'recording' });

    expect(session.playbackSource).toBe('recording');
    expect(broadcasts[0]).toMatchObject({ type: 'session-state', session: { playbackSource: 'recording' } });
  });

  it('resets playbackSource to synth when a genuinely different song is selected', () => {
    const ctx = makeCtx([recordingSong('s1'), recordingSong('s2')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    session.playbackSource = 'recording';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 's2' });

    expect(session.playbackSource).toBe('synth');
  });

  it('rejects switching to recording when the selected song is not recording-capable', () => {
    const ctx = makeCtx([synthSong('s1')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });

    const sent: ServerMessage[] = [];
    ctx.connections.send = (_socket, message) => { sent.push(message); };

    handlePlaybackSourceSet(ctx, hostSocket, { type: 'playback-source-set', source: 'recording' });

    expect(session.playbackSource).toBe('synth');
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'error' });
  });
});
