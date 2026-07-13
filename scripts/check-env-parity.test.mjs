import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffEnvKeys } from './check-env-parity.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function exampleKeys(relPath) {
  return new Set(
    readFileSync(join(REPO_ROOT, relPath), 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0].trim()),
  );
}

function withTempFiles(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'env-parity-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('matching keys on both sides pass (no mismatches)', () => {
  withTempFiles((dir) => {
    const envPath = join(dir, '.env');
    const examplePath = join(dir, '.env.example');
    writeFileSync(envPath, 'PORT=6080\nCATALOG_ROOT=./catalog\n');
    writeFileSync(examplePath, 'PORT=6080\nCATALOG_ROOT=./catalog\n');

    const result = diffEnvKeys(envPath, examplePath);

    assert.deepEqual(result, { missingFromEnv: [], missingFromExample: [] });
  });
});

test('a key present in .env.example but missing from .env fails', () => {
  withTempFiles((dir) => {
    const envPath = join(dir, '.env');
    const examplePath = join(dir, '.env.example');
    writeFileSync(envPath, 'PORT=6080\n');
    writeFileSync(examplePath, 'PORT=6080\nCATALOG_ROOT=./catalog\n');

    const result = diffEnvKeys(envPath, examplePath);

    assert.deepEqual(result.missingFromEnv, ['CATALOG_ROOT']);
    assert.deepEqual(result.missingFromExample, []);
  });
});

test('a key present in .env but missing from .env.example fails', () => {
  withTempFiles((dir) => {
    const envPath = join(dir, '.env');
    const examplePath = join(dir, '.env.example');
    writeFileSync(envPath, 'PORT=6080\nSECRET_KEY=abc123\n');
    writeFileSync(examplePath, 'PORT=6080\n');

    const result = diffEnvKeys(envPath, examplePath);

    assert.deepEqual(result.missingFromEnv, []);
    assert.deepEqual(result.missingFromExample, ['SECRET_KEY']);
  });
});

test('an absent .env file passes trivially — nothing to drift against', () => {
  withTempFiles((dir) => {
    const envPath = join(dir, '.env');
    const examplePath = join(dir, '.env.example');
    writeFileSync(examplePath, 'PORT=6080\nCATALOG_ROOT=./catalog\n');

    const result = diffEnvKeys(envPath, examplePath);

    assert.deepEqual(result, { missingFromEnv: [], missingFromExample: [] });
  });
});

test('server/.env.example documents the account-layer config surface (constitution Principle VIII, T001)', () => {
  const keys = exampleKeys('server/.env.example');
  for (const required of [
    'DATABASE_URL',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GITHUB_OAUTH_CLIENT_ID',
    'GITHUB_OAUTH_CLIENT_SECRET',
    'SESSION_COOKIE_SECRET',
    'PUBLIC_BASE_URL',
  ]) {
    assert.ok(keys.has(required), `server/.env.example is missing the ${required} key`);
  }
});

test('blank lines and #-comments are ignored when parsing keys', () => {
  withTempFiles((dir) => {
    const envPath = join(dir, '.env');
    const examplePath = join(dir, '.env.example');
    writeFileSync(envPath, '# a comment\nPORT=6080\n\nCATALOG_ROOT=./catalog\n');
    writeFileSync(examplePath, 'PORT=6080\n# another comment\nCATALOG_ROOT=./catalog\n\n');

    const result = diffEnvKeys(envPath, examplePath);

    assert.deepEqual(result, { missingFromEnv: [], missingFromExample: [] });
  });
});
