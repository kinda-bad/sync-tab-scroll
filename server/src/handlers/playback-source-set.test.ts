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

  // default-to-recording-source: a song that ships a recording defaults the
  // session to it; a song without one stays on synth. The default is applied
  // per song, so a host's switch to synth lasts only for that song.
  it('defaults to recording when a recording-capable song is selected, including the first song of a new session', () => {
    const ctx = makeCtx([recordingSong('s1')]);
    const session = ctx.sessionStore.create('host-1');
    expect(session.playbackSource).toBe('synth'); // no song yet
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 's1' });

    expect(session.playbackSource).toBe('recording');
  });

  it('resets playbackSource to synth when the newly selected song has no recording', () => {
    const ctx = makeCtx([recordingSong('s1'), synthSong('s2')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    session.playbackSource = 'recording';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 's2' });

    expect(session.playbackSource).toBe('synth');
  });

  it("re-applies the recording default on the next song, over a host's synth choice for the last one", () => {
    const ctx = makeCtx([recordingSong('s1'), recordingSong('s2')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    session.playbackSource = 'synth'; // host switched s1 to synth
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 's2' });

    expect(session.playbackSource).toBe('recording');
  });

  it("keeps the host's synth choice when the same song is re-selected", () => {
    const ctx = makeCtx([recordingSong('s1')]);
    const session = ctx.sessionStore.create('host-1');
    session.selectedSong = 's1';
    session.playbackSource = 'synth';
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};

    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 's1' });

    expect(session.playbackSource).toBe('synth');
  });

  it('lets the host switch a recording-defaulted song to synth', () => {
    const ctx = makeCtx([recordingSong('s1')]);
    const session = ctx.sessionStore.create('host-1');
    const hostSocket = fakeSocket();
    ctx.connections.attach(hostSocket, { sessionCode: session.code, participantId: 'host-1' });
    ctx.connections.broadcast = () => {};
    handleSongSelect(ctx, hostSocket, { type: 'song-select', songId: 's1' });

    handlePlaybackSourceSet(ctx, hostSocket, { type: 'playback-source-set', source: 'synth' });

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
