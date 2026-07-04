import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { hasConsent } from './consent.js';

let songDir: string;

beforeEach(() => {
  songDir = fs.mkdtempSync(path.join(os.tmpdir(), 'consent-'));
});

afterEach(() => {
  fs.rmSync(songDir, { recursive: true, force: true });
});

function writeConsent(record: object) {
  fs.writeFileSync(path.join(songDir, 'consent.json'), JSON.stringify(record));
}

describe('hasConsent', () => {
  it('returns false when the song directory has no consent.json', () => {
    expect(hasConsent(songDir)).toBe(false);
  });

  it('returns false when consent.json is malformed JSON', () => {
    fs.writeFileSync(path.join(songDir, 'consent.json'), 'not json');

    expect(hasConsent(songDir)).toBe(false);
  });

  it('returns false when consent.json is missing a required field', () => {
    writeConsent({ submitterName: 'Alice', acceptedAt: 1 });

    expect(hasConsent(songDir)).toBe(false);
  });

  it('returns true when consent.json matches the ConsentRecord shape', () => {
    writeConsent({ submitterName: 'Alice', tosVersion: 'dev-placeholder', acceptedAt: 1720000000000 });

    expect(hasConsent(songDir)).toBe(true);
  });
});
