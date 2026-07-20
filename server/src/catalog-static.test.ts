import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createCatalogRequestHandler } from './catalog-static.js';

let catalogRoot: string;

beforeEach(() => {
  catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-static-'));
});

afterEach(() => {
  fs.rmSync(catalogRoot, { recursive: true, force: true });
});

function fakeReq(url: string, headers: Record<string, string> = {}): IncomingMessage {
  return { url, headers } as unknown as IncomingMessage;
}

function fakeRes() {
  const chunks: Buffer[] = [];
  let statusCode: number | undefined;
  let headers: Record<string, string> | undefined;
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.from(chunk));
      cb();
    },
  }) as unknown as ServerResponse & { chunks: Buffer[]; statusCode?: number; headers?: Record<string, string> };
  stream.writeHead = ((code: number, hdrs?: Record<string, string>) => {
    statusCode = code;
    headers = hdrs;
    return stream;
  }) as unknown as typeof stream.writeHead;
  Object.defineProperty(stream, 'statusCode', { get: () => statusCode });
  Object.defineProperty(stream, 'headers', { get: () => headers });
  Object.defineProperty(stream, 'chunks', { get: () => chunks });
  return stream;
}

describe('createCatalogRequestHandler', () => {
  it('returns false and writes nothing for a URL not under /catalog/', () => {
    fs.writeFileSync(path.join(catalogRoot, 'song.gp'), 'data');
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/other/path'), res);

    expect(handled).toBe(false);
    expect(res.statusCode).toBeUndefined();
  });

  it('serves an existing file with the right content-type', async () => {
    fs.writeFileSync(path.join(catalogRoot, 'song.gp'), 'binary-content');
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/catalog/song.gp'), res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers).toMatchObject({ 'Content-Type': 'application/octet-stream' });
    expect(Buffer.concat(res.chunks).toString()).toBe('binary-content');
  });

  it('serves a .lrc file with a text content-type', async () => {
    fs.writeFileSync(path.join(catalogRoot, 'lyrics.lrc'), '[00:01.00]hi');
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    handler(fakeReq('/catalog/lyrics.lrc'), res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(res.headers).toMatchObject({ 'Content-Type': 'text/plain; charset=utf-8' });
  });

  it('serves an .mp3 file with an audio/mpeg content-type (T010)', async () => {
    fs.writeFileSync(path.join(catalogRoot, 'recording.mp3'), 'id3-bytes');
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    handler(fakeReq('/catalog/recording.mp3'), res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(res.headers).toMatchObject({ 'Content-Type': 'audio/mpeg' });
  });

  it('404s a nonexistent file', () => {
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/catalog/nope.gp'), res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });

  describe('HTTP Range support (T011)', () => {
    // A 12-byte body so byte offsets are easy to reason about.
    const body = 'ABCDEFGHIJKL';

    it('advertises Accept-Ranges: bytes and still returns a full 200 when no Range header is sent', async () => {
      fs.writeFileSync(path.join(catalogRoot, 'recording.mp3'), body);
      const handler = createCatalogRequestHandler(catalogRoot);
      const res = fakeRes();

      handler(fakeReq('/catalog/recording.mp3'), res);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(res.statusCode).toBe(200);
      expect(res.headers).toMatchObject({ 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes' });
      expect(Buffer.concat(res.chunks).toString()).toBe(body);
    });

    it('returns 206 with the requested slice and a correct inclusive Content-Range for a valid Range', async () => {
      fs.writeFileSync(path.join(catalogRoot, 'recording.mp3'), body);
      const handler = createCatalogRequestHandler(catalogRoot);
      const res = fakeRes();

      handler(fakeReq('/catalog/recording.mp3', { range: 'bytes=3-7' }), res);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(res.statusCode).toBe(206);
      expect(res.headers).toMatchObject({
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes 3-7/${body.length}`,
        'Content-Length': '5',
      });
      expect(Buffer.concat(res.chunks).toString()).toBe('DEFGH');
    });

    it('treats an open-ended Range (bytes=N-) as running to the last byte', async () => {
      fs.writeFileSync(path.join(catalogRoot, 'recording.mp3'), body);
      const handler = createCatalogRequestHandler(catalogRoot);
      const res = fakeRes();

      handler(fakeReq('/catalog/recording.mp3', { range: 'bytes=9-' }), res);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(res.statusCode).toBe(206);
      expect(res.headers).toMatchObject({ 'Content-Range': `bytes 9-11/${body.length}` });
      expect(Buffer.concat(res.chunks).toString()).toBe('JKL');
    });

    it('returns 416 with Content-Range bytes */size for an unsatisfiable Range (start past EOF)', async () => {
      fs.writeFileSync(path.join(catalogRoot, 'recording.mp3'), body);
      const handler = createCatalogRequestHandler(catalogRoot);
      const res = fakeRes();

      handler(fakeReq('/catalog/recording.mp3', { range: 'bytes=99-120' }), res);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(res.statusCode).toBe(416);
      expect(res.headers).toMatchObject({ 'Content-Range': `bytes */${body.length}` });
    });

    it('ignores an unparseable Range header and serves a full 200', async () => {
      fs.writeFileSync(path.join(catalogRoot, 'recording.mp3'), body);
      const handler = createCatalogRequestHandler(catalogRoot);
      const res = fakeRes();

      handler(fakeReq('/catalog/recording.mp3', { range: 'pages=1-2' }), res);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(res.statusCode).toBe(200);
      expect(Buffer.concat(res.chunks).toString()).toBe(body);
    });
  });

  it('404s a path-traversal attempt rather than escaping catalogRoot', () => {
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/catalog/../../etc/passwd'), res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });
});
