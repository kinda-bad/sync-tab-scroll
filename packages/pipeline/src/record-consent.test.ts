import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { recordConsent } from './record-consent.js';

let catalogRoot: string;

beforeEach(() => {
  catalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'record-consent-'));
  fs.mkdirSync(path.join(catalogRoot, 'creep'), { recursive: true });
  fs.writeFileSync(path.join(catalogRoot, 'creep', 'meta.json'), '{}');
  fs.writeFileSync(path.join(catalogRoot, 'creep', 'song.gp'), '');
  fs.writeFileSync(path.join(catalogRoot, 'creep', 'lyrics.lrc'), '');
});

afterEach(() => {
  fs.rmSync(catalogRoot, { recursive: true, force: true });
});

describe('recordConsent', () => {
  it('writes a well-formed consent.json into the song directory', () => {
    recordConsent(catalogRoot, 'creep', 'Alice');

    const record = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'creep', 'consent.json'), 'utf8'));
    expect(record.submitterName).toBe('Alice');
    expect(typeof record.tosVersion).toBe('string');
    expect(typeof record.acceptedAt).toBe('number');
  });

  it('does not touch the song directory\'s existing extraction outputs', () => {
    const before = {
      meta: fs.readFileSync(path.join(catalogRoot, 'creep', 'meta.json'), 'utf8'),
      gp: fs.readFileSync(path.join(catalogRoot, 'creep', 'song.gp'), 'utf8'),
      lrc: fs.readFileSync(path.join(catalogRoot, 'creep', 'lyrics.lrc'), 'utf8'),
    };

    recordConsent(catalogRoot, 'creep', 'Alice');

    expect(fs.readFileSync(path.join(catalogRoot, 'creep', 'meta.json'), 'utf8')).toBe(before.meta);
    expect(fs.readFileSync(path.join(catalogRoot, 'creep', 'song.gp'), 'utf8')).toBe(before.gp);
    expect(fs.readFileSync(path.join(catalogRoot, 'creep', 'lyrics.lrc'), 'utf8')).toBe(before.lrc);
  });

  it('throws when the target song directory does not exist', () => {
    expect(() => recordConsent(catalogRoot, 'does-not-exist', 'Alice')).toThrow();
  });
});
