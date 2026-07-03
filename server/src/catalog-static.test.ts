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

function fakeReq(url: string): IncomingMessage {
  return { url } as IncomingMessage;
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
  }) as ServerResponse['writeHead'];
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
    expect(res.headers).toEqual({ 'Content-Type': 'application/octet-stream' });
    expect(Buffer.concat(res.chunks).toString()).toBe('binary-content');
  });

  it('serves a .lrc file with a text content-type', async () => {
    fs.writeFileSync(path.join(catalogRoot, 'lyrics.lrc'), '[00:01.00]hi');
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    handler(fakeReq('/catalog/lyrics.lrc'), res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(res.headers).toEqual({ 'Content-Type': 'text/plain; charset=utf-8' });
  });

  it('404s a nonexistent file', () => {
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/catalog/nope.gp'), res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });

  it('404s a path-traversal attempt rather than escaping catalogRoot', () => {
    const handler = createCatalogRequestHandler(catalogRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/catalog/../../etc/passwd'), res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });
});
