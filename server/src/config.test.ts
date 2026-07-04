import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const ENV_KEYS = ['PORT', 'CATALOG_ROOT', 'HOST_REASSIGN_GRACE_MS', 'REQUIRE_SONG_CONSENT'] as const;
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
  it('reads PORT/CATALOG_ROOT/HOST_REASSIGN_GRACE_MS from process.env when set', () => {
    process.env.PORT = '9999';
    process.env.CATALOG_ROOT = '/tmp/my-catalog';
    process.env.HOST_REASSIGN_GRACE_MS = '5000';

    expect(loadConfig()).toEqual({ port: 9999, catalogRoot: '/tmp/my-catalog', hostReassignGraceMs: 5000, requireSongConsent: false });
  });

  it('falls back to documented defaults when unset', () => {
    expect(loadConfig()).toEqual({ port: 8080, catalogRoot: './catalog', hostReassignGraceMs: 120_000, requireSongConsent: false });
  });

  it('sets requireSongConsent to true when REQUIRE_SONG_CONSENT=true', () => {
    process.env.REQUIRE_SONG_CONSENT = 'true';

    expect(loadConfig().requireSongConsent).toBe(true);
  });

  it('defaults requireSongConsent to false when REQUIRE_SONG_CONSENT is unset', () => {
    expect(loadConfig().requireSongConsent).toBe(false);
  });
});
