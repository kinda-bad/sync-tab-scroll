import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const ENV_KEYS = [
  'PORT',
  'CATALOG_ROOT',
  'HOST_REASSIGN_GRACE_MS',
  'REQUIRE_SONG_CONSENT',
  'SONG_UPLOAD_ENABLED',
  'CLIENT_ROOT',
  'DATABASE_URL',
  'SESSION_COOKIE_SECRET',
  'PUBLIC_BASE_URL',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GITHUB_OAUTH_CLIENT_ID',
  'GITHUB_OAUTH_CLIENT_SECRET',
] as const;

const DEFAULT_ACCOUNT = {
  databaseUrl: undefined,
  sessionCookieSecret: '',
  publicBaseUrl: 'http://localhost:6000',
  google: { clientId: '', clientSecret: '' },
  github: { clientId: '', clientSecret: '' },
};
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe('loadConfig', () => {
  it('reads PORT/CATALOG_ROOT/HOST_REASSIGN_GRACE_MS/CLIENT_ROOT from process.env when set', () => {
    process.env.PORT = '9999';
    process.env.CATALOG_ROOT = '/tmp/my-catalog';
    process.env.HOST_REASSIGN_GRACE_MS = '5000';
    process.env.CLIENT_ROOT = '/tmp/my-client-dist';

    expect(loadConfig()).toEqual({
      port: 9999,
      catalogRoot: '/tmp/my-catalog',
      hostReassignGraceMs: 5000,
      requireSongConsent: false,
      songUploadEnabled: true,
      clientRoot: '/tmp/my-client-dist',
      account: DEFAULT_ACCOUNT,
    });
  });

  it('falls back to documented defaults when unset', () => {
    expect(loadConfig()).toEqual({
      port: 6080,
      catalogRoot: './catalog',
      hostReassignGraceMs: 120_000,
      requireSongConsent: false,
      songUploadEnabled: true,
      clientRoot: '../client/dist',
      account: DEFAULT_ACCOUNT,
    });
  });

  it('reads the account layer from env (databaseUrl, cookie secret, OAuth creds)', () => {
    process.env.DATABASE_URL = 'postgres://localhost/db';
    process.env.SESSION_COOKIE_SECRET = 'shh';
    process.env.PUBLIC_BASE_URL = 'https://example.test';
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'gid';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'gsec';
    process.env.GITHUB_OAUTH_CLIENT_ID = 'hid';
    process.env.GITHUB_OAUTH_CLIENT_SECRET = 'hsec';

    expect(loadConfig().account).toEqual({
      databaseUrl: 'postgres://localhost/db',
      sessionCookieSecret: 'shh',
      publicBaseUrl: 'https://example.test',
      google: { clientId: 'gid', clientSecret: 'gsec' },
      github: { clientId: 'hid', clientSecret: 'hsec' },
    });
  });

  it('treats an empty DATABASE_URL as unset (accounts disabled)', () => {
    process.env.DATABASE_URL = '';
    expect(loadConfig().account.databaseUrl).toBeUndefined();
  });

  it('sets requireSongConsent to true when REQUIRE_SONG_CONSENT=true', () => {
    process.env.REQUIRE_SONG_CONSENT = 'true';

    expect(loadConfig().requireSongConsent).toBe(true);
  });

  it('defaults requireSongConsent to false when REQUIRE_SONG_CONSENT is unset', () => {
    expect(loadConfig().requireSongConsent).toBe(false);
  });

  it('defaults songUploadEnabled to true when SONG_UPLOAD_ENABLED is unset (T014 — self-hosted works unconfigured)', () => {
    expect(loadConfig().songUploadEnabled).toBe(true);
  });

  it('sets songUploadEnabled to false when SONG_UPLOAD_ENABLED=false (T014 — public deployment gate before real ToS text)', () => {
    process.env.SONG_UPLOAD_ENABLED = 'false';

    expect(loadConfig().songUploadEnabled).toBe(false);
  });
});
