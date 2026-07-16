import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ServerMessage } from '@sync-tab-scroll/shared';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import { NullAccountStore } from './accounts/null-store.js';
import type { HandlerContext } from './handlers/context.js';
import { loadCatalog } from './catalog-loader.js';
import { rescanAndBroadcastCatalog } from './authoring-rescan.js';

let catalogRoot: string;

beforeEach(() => {
  catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'authoring-rescan-'));
});

afterEach(() => {
  fs.rmSync(catalogRoot, { recursive: true, force: true });
});

function writeSong(dirName: string) {
  const songDir = path.join(catalogRoot, dirName);
  fs.mkdirSync(songDir, { recursive: true });
  fs.writeFileSync(
    path.join(songDir, 'meta.json'),
    JSON.stringify({ name: 'Song', artist: 'Artist', parts: [{ instrumentName: 'Guitar', trackIndex: 0 }], lyricsTrackIndex: null, lyricsLineIndex: null, lyricLineBreaks: null }),
  );
  fs.writeFileSync(path.join(songDir, 'song.gp'), '');
}

function makeCtx(): HandlerContext {
  return {
    sessionStore: new SessionStore(),
    connections: new ConnectionRegistry(),
    accountStore: new NullAccountStore(),
    catalog: loadCatalog(catalogRoot),
  };
}

describe('rescanAndBroadcastCatalog (T005)', () => {
  it('reassigns ctx.catalog and re-broadcasts `catalog` to a session whose visible set grew', () => {
    const ctx = makeCtx();
    const session = ctx.sessionStore.create('host-1');
    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, build) => broadcasts.push(build('host-1'));

    writeSong('creep'); // added to the filesystem AFTER ctx.catalog was built

    rescanAndBroadcastCatalog(ctx, catalogRoot);

    expect(ctx.catalog.songs.map((s) => s.id)).toEqual(['creep']);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]).toMatchObject({ type: 'catalog' });
    expect((broadcasts[0] as { songs: { id: string }[] }).songs.map((s) => s.id)).toEqual(['creep']);
  });

  it('does not re-broadcast to a session whose visible set is unchanged', () => {
    writeSong('creep');
    const ctx = makeCtx(); // already includes 'creep'
    ctx.sessionStore.create('host-1');
    const broadcasts: ServerMessage[] = [];
    ctx.connections.broadcast = (_code, build) => broadcasts.push(build('host-1'));

    rescanAndBroadcastCatalog(ctx, catalogRoot); // re-scan finds the same songs

    expect(broadcasts).toEqual([]);
  });

  it('threads requireSongConsent through to the re-scan', () => {
    const ctx = makeCtx();
    ctx.sessionStore.create('host-1');
    ctx.connections.broadcast = () => {};

    writeSong('creep'); // no consent record written

    rescanAndBroadcastCatalog(ctx, catalogRoot, true);

    expect(ctx.catalog.songs).toEqual([]); // dropped — requireSongConsent enabled
  });
});
