import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createCatalogue, rotateCatalogueKey } from './create-catalogue.js';

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

  it('writes epoch 1 on a new private catalogue (datamodel.md Activation Key epoch, T012)', () => {
    createCatalogue(catalogRoot, 'premium-pack', 'Premium Pack', 'private', 's3cr3t');
    const record = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'premium-pack', 'catalogue.json'), 'utf8'));
    expect(record.epoch).toBe(1);
  });

  describe('rotateCatalogueKey (T012 — key rotation bumps epoch + regenerates salt/hash)', () => {
    it('increments epoch and regenerates salt/hash for the new key', () => {
      createCatalogue(catalogRoot, 'premium-pack', 'Premium Pack', 'private', 'old-key');
      const before = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'premium-pack', 'catalogue.json'), 'utf8'));

      rotateCatalogueKey(catalogRoot, 'premium-pack', 'new-key');
      const after = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'premium-pack', 'catalogue.json'), 'utf8'));

      expect(after.epoch).toBe(before.epoch + 1);
      expect(after.salt).not.toBe(before.salt);
      expect(after.hash).not.toBe(before.hash);
      expect(after.name).toBe('Premium Pack');
      // The new hash verifies against the new key with the new salt.
      expect(after.hash).toBe(crypto.scryptSync('new-key', after.salt, 64).toString('hex'));
    });

    it('bumps a pre-existing catalogue.json that has no epoch field from an implied 1 to 2', () => {
      // Simulate a legacy record written before the epoch field existed.
      const dir = path.join(catalogRoot, 'legacy');
      fs.mkdirSync(dir, { recursive: true });
      const salt = crypto.randomBytes(16).toString('hex');
      fs.writeFileSync(
        path.join(dir, 'catalogue.json'),
        JSON.stringify({ name: 'Legacy', salt, hash: crypto.scryptSync('k', salt, 64).toString('hex') }),
      );

      rotateCatalogueKey(catalogRoot, 'legacy', 'k2');
      const after = JSON.parse(fs.readFileSync(path.join(dir, 'catalogue.json'), 'utf8'));
      expect(after.epoch).toBe(2);
    });

    it('throws for a non-existent or public catalogue (nothing to rotate)', () => {
      createCatalogue(catalogRoot, 'free-pack', 'Free Pack', 'public');
      expect(() => rotateCatalogueKey(catalogRoot, 'free-pack', 'k')).toThrow();
      expect(() => rotateCatalogueKey(catalogRoot, 'missing', 'k')).toThrow();
    });
  });
});
