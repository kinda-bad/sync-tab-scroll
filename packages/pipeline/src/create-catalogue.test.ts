import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createCatalogue } from './create-catalogue.js';

let catalogRoot: string;

beforeEach(() => {
  catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-catalogue-'));
});

afterEach(() => {
  fs.rmSync(catalogRoot, { recursive: true, force: true });
});

describe('createCatalogue', () => {
  it('writes a catalogue.json with name, salt, and a scrypt hash of the key for a private catalogue', () => {
    createCatalogue(catalogRoot, 'premium-pack', 'Premium Pack', 'private', 's3cr3t');

    const record = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'premium-pack', 'catalogue.json'), 'utf8'));
    expect(record.name).toBe('Premium Pack');
    expect(typeof record.salt).toBe('string');
    expect(record.salt.length).toBeGreaterThan(0);
    // The stored hash must be scrypt(key, salt, 64) hex computed with the same salt.
    const expected = crypto.scryptSync('s3cr3t', record.salt, 64).toString('hex');
    expect(record.hash).toBe(expected);
  });

  it('generates a distinct random salt per catalogue', () => {
    createCatalogue(catalogRoot, 'pack-a', 'Pack A', 'private', 'key');
    createCatalogue(catalogRoot, 'pack-b', 'Pack B', 'private', 'key');

    const a = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'pack-a', 'catalogue.json'), 'utf8'));
    const b = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'pack-b', 'catalogue.json'), 'utf8'));
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('creates the directory but writes no catalogue.json for a public catalogue', () => {
    createCatalogue(catalogRoot, 'free-pack', 'Free Pack', 'public');

    expect(fs.existsSync(path.join(catalogRoot, 'free-pack'))).toBe(true);
    expect(fs.existsSync(path.join(catalogRoot, 'free-pack', 'catalogue.json'))).toBe(false);
  });

  it('throws when a private catalogue is requested without a key', () => {
    expect(() => createCatalogue(catalogRoot, 'premium-pack', 'Premium Pack', 'private')).toThrow();
  });
});
