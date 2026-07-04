import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diffEnvKeys } from './check-env-parity.mjs';

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
