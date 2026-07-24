import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NullAccountStore } from './accounts/null-store.js';
import type { AccountStore } from './accounts/store.js';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import type { HandlerContext } from './handlers/context.js';
import { loadCatalog } from './catalog-loader.js';
import { createSongUploadRequestHandler, type SongUploadRouteOptions } from './song-upload-route.js';

const extractLyricsMock = vi.hoisted(() => vi.fn());
const recordConsentMock = vi.hoisted(() => vi.fn());
vi.mock('@sync-tab-scroll/pipeline', () => ({ extractLyrics: extractLyricsMock, recordConsent: recordConsentMock }));

function startServer(overrides: Partial<SongUploadRouteOptions> & { store: AccountStore; catalogRoot: string }) {
  const handler = createSongUploadRequestHandler(overrides);
  const server = http.createServer((req, res) => {
    if (handler(req, res)) return;
    res.writeHead(404).end();
  });
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

function ownerStore(): AccountStore {
  const store = new NullAccountStore();
  store.getAuthSession = vi.fn(async () => ({ id: 's', userId: 'user-1', createdAt: 0, expiresAt: Date.now() + 100_000, revokedAt: null }));
  store.getUser = vi.fn(async () => ({ id: 'user-1', oauthProvider: 'google' as const, oauthSubject: 'sub', displayName: 'U', email: null, createdAt: 0 }));
  store.isOwner = vi.fn(async () => true);
  return store;
}

describe('song upload route — auth gate (T008)', () => {
  let store: AccountStore;
  let srv: ReturnType<typeof startServer>;

  beforeEach(() => {
    store = new NullAccountStore();
  });

  afterEach(async () => {
    await srv?.close();
  });

  it('falls through (returns false / 404 via the caller) for a non-matching path', async () => {
    srv = startServer({ store, catalogRoot: '/nonexistent-catalog-root-T008' });
    const res = await fetch(`${srv.base}/not-the-route`, { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('falls through for a matching path but wrong method (GET)', async () => {
    srv = startServer({ store, catalogRoot: '/nonexistent-catalog-root-T008' });
    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs`, { method: 'GET' });
    expect(res.status).toBe(404);
  });

  it('rejects with 401 when no session cookie is present (not signed in)', async () => {
    srv = startServer({ store, catalogRoot: '/nonexistent-catalog-root-T008' });
    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('rejects with 403 for a signed-in user who is not an owner of the catalogue', async () => {
    store.getAuthSession = vi.fn(async () => ({ id: 's', userId: 'user-1', createdAt: 0, expiresAt: Date.now() + 100_000, revokedAt: null }));
    store.getUser = vi.fn(async () => ({ id: 'user-1', oauthProvider: 'google' as const, oauthSubject: 'sub', displayName: 'U', email: null, createdAt: 0 }));
    store.isOwner = vi.fn(async () => false);
    srv = startServer({ store, catalogRoot: '/nonexistent-catalog-root-T008' });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs`, { method: 'POST', headers: { Cookie: 'sts_session=s' } });

    expect(res.status).toBe(403);
    expect(store.isOwner).toHaveBeenCalledWith('kinda-bad', 'user-1');
  });
});

describe('song upload route — size limit + staging (T009)', () => {
  let catalogRoot: string;
  let srv: ReturnType<typeof startServer>;

  beforeEach(() => {
    catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'song-upload-catalog-'));
    extractLyricsMock.mockReset();
  });

  afterEach(async () => {
    await srv?.close();
    fs.rmSync(catalogRoot, { recursive: true, force: true });
  });

  it('rejects an oversized upload with 413 before it is fully buffered/written anywhere, and the live catalog directory stays untouched', async () => {
    srv = startServer({ store: ownerStore(), catalogRoot, maxUploadBytes: 10 });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=A&title=B&submitterName=S`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: Buffer.alloc(1000, 1), // far over the 10-byte cap
    });

    expect(res.status).toBe(413);
    expect(extractLyricsMock).not.toHaveBeenCalled(); // never even reached the pipeline stage
    expect(fs.readdirSync(catalogRoot)).toEqual([]); // nothing written to the live catalog
  });

  it('a well-under-the-limit upload proceeds to the pipeline stage', async () => {
    extractLyricsMock.mockImplementation(async () => {
      throw new Error('boom — proves staging succeeded and handed off to the pipeline');
    });
    srv = startServer({ store: ownerStore(), catalogRoot, maxUploadBytes: 10_000 });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=A&title=B&submitterName=S`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: Buffer.alloc(100, 1),
    });

    expect(extractLyricsMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(400); // the mock's throw surfaces as a parse failure
  });

  it('requires artist, title, and submitterName query params before touching the request body', async () => {
    srv = startServer({ store: ownerStore(), catalogRoot });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs`, { method: 'POST', headers: { Cookie: 'sts_session=s' }, body: 'x' });

    expect(res.status).toBe(400);
    expect(extractLyricsMock).not.toHaveBeenCalled();
  });

  // T010: applies the generalized validateField (input-validation.ts) to
  // artist/title/submitterName — notably before buildStagedFilename(artist,
  // title) builds a filesystem path from them, previously unvalidated
  // attacker-controlled input feeding a path construction.
  it('rejects an invalid artist (control/HTML chars) with 400 before touching the request body', async () => {
    srv = startServer({ store: ownerStore(), catalogRoot });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=${encodeURIComponent('<script>')}&title=B&submitterName=S`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: 'x',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
    expect(extractLyricsMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid title (control/HTML chars) with 400', async () => {
    srv = startServer({ store: ownerStore(), catalogRoot });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=A&title=${encodeURIComponent('<b>B</b>')}&submitterName=S`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: 'x',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
    expect(extractLyricsMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid submitterName (control/HTML chars) with 400', async () => {
    srv = startServer({ store: ownerStore(), catalogRoot });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=A&title=B&submitterName=${encodeURIComponent('<i>S</i>')}`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: 'x',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
    expect(extractLyricsMock).not.toHaveBeenCalled();
  });
});

describe('song upload route — availability gate (T014)', () => {
  let catalogRoot: string;
  let srv: ReturnType<typeof startServer>;

  beforeEach(() => {
    catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'song-upload-catalog-'));
  });

  afterEach(async () => {
    await srv?.close();
    fs.rmSync(catalogRoot, { recursive: true, force: true });
  });

  it('defaults to enabled when songUploadEnabled is omitted', async () => {
    srv = startServer({ store: new NullAccountStore(), catalogRoot });
    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs`, { method: 'POST' });
    // 401 (auth gate), not 503 — proves the route ran past the availability check.
    expect(res.status).toBe(401);
  });

  it('returns 503 before any auth check when songUploadEnabled is false', async () => {
    srv = startServer({ store: new NullAccountStore(), catalogRoot, songUploadEnabled: false });
    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs`, { method: 'POST' });
    expect(res.status).toBe(503);
  });
});

describe('song upload route — pipeline execution + timeout (T010)', () => {
  let catalogRoot: string;
  let srv: ReturnType<typeof startServer>;

  beforeEach(() => {
    catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'song-upload-catalog-'));
    extractLyricsMock.mockReset();
    recordConsentMock.mockReset();
  });

  afterEach(async () => {
    await srv?.close();
    fs.rmSync(catalogRoot, { recursive: true, force: true });
  });

  it('a malformed .gp file (real extraction, no mock) is rejected without corrupting or partially writing into the live catalog directory', async () => {
    extractLyricsMock.mockImplementation(async () => {
      throw new Error('not a valid Guitar Pro file');
    });
    srv = startServer({ store: ownerStore(), catalogRoot });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=A&title=B&submitterName=S`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: 'this is not a zip file',
    });

    expect(res.status).toBe(400);
    expect(fs.readdirSync(catalogRoot)).toEqual([]);
  });

  it('on success, moves the staged output into the live catalog and re-broadcasts', async () => {
    extractLyricsMock.mockImplementation(async (_gpPath: string, stagingCatalogRoot: string) => {
      const songDir = path.join(stagingCatalogRoot, 'a-b');
      fs.mkdirSync(songDir, { recursive: true });
      fs.writeFileSync(path.join(songDir, 'meta.json'), JSON.stringify({ name: 'B', artist: 'A', parts: [{ instrumentName: 'Guitar', trackIndex: 0 }], lyricsTrackIndex: null, lyricsLineIndex: null, lyricLineBreaks: null }));
      fs.writeFileSync(path.join(songDir, 'song.gp'), '');
    });

    const ctx: HandlerContext = { sessionStore: new SessionStore(), connections: new ConnectionRegistry(), accountStore: new NullAccountStore(), catalog: loadCatalog(catalogRoot) };
    const broadcasts: unknown[] = [];
    ctx.sessionStore.create('host-1');
    ctx.connections.broadcast = (_code, build) => broadcasts.push(build('host-1'));

    srv = startServer({ store: ownerStore(), catalogRoot, ctx });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=A&title=B&submitterName=S`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: Buffer.from('fake-gp-bytes'),
    });

    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(catalogRoot, 'a-b', 'meta.json'))).toBe(true);
    expect(broadcasts.some((m) => (m as { type: string }).type === 'catalog')).toBe(true);
    expect(ctx.catalog.songs.map((s) => s.id)).toContain('a-b');
    // T015: writes a Consent Record using the same shared writer the CLI's
    // record-consent uses — into the LIVE directory, after the move.
    expect(recordConsentMock).toHaveBeenCalledWith(catalogRoot, 'a-b', 'S');
  });

  it('times out a hung pipeline stage rather than hanging the response, and nothing reaches the live catalog', async () => {
    extractLyricsMock.mockImplementation(() => new Promise(() => {})); // never resolves
    srv = startServer({ store: ownerStore(), catalogRoot, parseTimeoutMs: 30 });

    const res = await fetch(`${srv.base}/catalogues/kinda-bad/songs?artist=A&title=B&submitterName=S`, {
      method: 'POST',
      headers: { Cookie: 'sts_session=s' },
      body: Buffer.from('fake-gp-bytes'),
    });

    expect(res.status).toBe(504);
    expect(fs.readdirSync(catalogRoot)).toEqual([]);
  });
});
