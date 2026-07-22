import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServerConfig } from './config.js';
import { createServer } from './server.js';

/**
 * The WS upgrade must reject a disallowed Origin BEFORE any cookie is read
 * (§13 S3). Allowed origins upgrade normally; a foreign origin's upgrade is
 * refused, so a cross-site page can't ride the auth cookie onto a socket.
 */
function testConfig(): ServerConfig {
  return {
    port: 0,
    catalogRoot: './__no_such_catalog__',
    hostReassignGraceMs: 1000,
    sessionEmptyTtlMs: 30_000,
    requireSongConsent: false,
    songUploadEnabled: true,
    clientRoot: './__no_such_client__',
    devUnlockAllCatalogues: false,
    account: {
      databaseUrl: undefined,
      sessionCookieSecret: 'test',
      publicBaseUrl: 'https://app.example',
      google: { clientId: '', clientSecret: '' },
      github: { clientId: '', clientSecret: '' },
    },
  };
}

describe('WS upgrade Origin allowlist (T010)', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    server = createServer(testConfig());
    await new Promise<void>((resolve) => {
      if (server.listening) return resolve();
      server.once('listening', () => resolve());
    });
    port = (server.address() as AddressInfo).port;
  });

  afterEach(() => new Promise<void>((r) => server.close(() => r())));

  function connect(origin: string): Promise<'open' | 'rejected'> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin });
      ws.on('open', () => {
        ws.close();
        resolve('open');
      });
      ws.on('error', () => resolve('rejected'));
      ws.on('unexpected-response', () => resolve('rejected'));
    });
  }

  it('allows an allowed origin (localhost dev) to upgrade', async () => {
    expect(await connect('http://localhost:6100')).toBe('open');
  });

  it('rejects a foreign origin before the connection opens', async () => {
    expect(await connect('https://evil.example')).toBe('rejected');
  });
});
