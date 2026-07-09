import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClientStaticRequestHandler } from './client-static.js';

let clientRoot: string;

beforeEach(() => {
  clientRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'client-static-'));
});

afterEach(() => {
  fs.rmSync(clientRoot, { recursive: true, force: true });
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
  }) as unknown as typeof stream.writeHead;
  Object.defineProperty(stream, 'statusCode', { get: () => statusCode });
  Object.defineProperty(stream, 'headers', { get: () => headers });
  Object.defineProperty(stream, 'chunks', { get: () => chunks });
  return stream;
}

describe('createClientStaticRequestHandler', () => {
  it('returns false and writes nothing for a /catalog/... URL, leaving it to the catalog handler', () => {
    fs.writeFileSync(path.join(clientRoot, 'index.html'), '<html></html>');
    const handler = createClientStaticRequestHandler(clientRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/catalog/creep/creep.gp'), res);

    expect(handled).toBe(false);
    expect(res.statusCode).toBeUndefined();
  });

  it('serves index.html for the root path', async () => {
    fs.writeFileSync(path.join(clientRoot, 'index.html'), '<html>root</html>');
    const handler = createClientStaticRequestHandler(clientRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/'), res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers).toEqual({ 'Content-Type': 'text/html; charset=utf-8' });
    expect(Buffer.concat(res.chunks).toString()).toBe('<html>root</html>');
  });

  it('serves an existing asset file with the right content-type', async () => {
    fs.mkdirSync(path.join(clientRoot, 'assets'));
    fs.writeFileSync(path.join(clientRoot, 'assets', 'index-abc123.js'), 'console.log(1)');
    const handler = createClientStaticRequestHandler(clientRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/assets/index-abc123.js'), res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers).toEqual({ 'Content-Type': 'text/javascript; charset=utf-8' });
    expect(Buffer.concat(res.chunks).toString()).toBe('console.log(1)');
  });

  it('serves a font asset with an application/octet-stream fallback content-type', async () => {
    fs.mkdirSync(path.join(clientRoot, 'font'));
    fs.writeFileSync(path.join(clientRoot, 'font', 'Bravura.woff2'), 'binary-font-data');
    const handler = createClientStaticRequestHandler(clientRoot);
    const res = fakeRes();

    handler(fakeReq('/font/Bravura.woff2'), res);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(res.headers).toEqual({ 'Content-Type': 'font/woff2' });
  });

  it('404s a nonexistent file rather than falling through', () => {
    fs.writeFileSync(path.join(clientRoot, 'index.html'), '<html></html>');
    const handler = createClientStaticRequestHandler(clientRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/assets/nope.js'), res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });

  it('404s a path-traversal attempt rather than escaping clientRoot', () => {
    const handler = createClientStaticRequestHandler(clientRoot);
    const res = fakeRes();

    const handled = handler(fakeReq('/../../etc/passwd'), res);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });
});
