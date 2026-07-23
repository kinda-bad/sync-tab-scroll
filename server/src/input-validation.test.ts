import { describe, expect, it } from 'vitest';
import { validateDisplayName, validateActivationKey } from './input-validation.js';

// T001: shared server-side input validation for displayName/activation-key
// input (feedback-input-sanitization-hardening-7a9a F001). Rejects control
// characters and HTML tags, enforces a length cap, and passes Unicode/emoji
// through unchanged.

describe('validateDisplayName', () => {
  it('strips control characters', () => {
    expect(validateDisplayName('Alice\x00\x07Bob')).toBe('AliceBob');
  });

  it('strips HTML special characters so no tag can form', () => {
    expect(validateDisplayName('<script>alert(1)</script>Alice')).toBe('scriptalert(1)/scriptAlice');
  });

  it('enforces a length cap', () => {
    const long = 'a'.repeat(500);
    expect(validateDisplayName(long).length).toBeLessThanOrEqual(64);
  });

  it('passes Unicode/emoji through unchanged', () => {
    expect(validateDisplayName('Ada 😀 Ünïcode')).toBe('Ada 😀 Ünïcode');
  });
});

describe('validateActivationKey', () => {
  it('strips control characters', () => {
    expect(validateActivationKey('abc\x00def')).toBe('abcdef');
  });

  it('strips HTML special characters so no tag can form', () => {
    expect(validateActivationKey('<b>key</b>')).toBe('bkey/b');
  });

  it('enforces a length cap', () => {
    const long = 'k'.repeat(500);
    expect(validateActivationKey(long).length).toBeLessThanOrEqual(256);
  });

  it('passes Unicode/emoji through unchanged', () => {
    expect(validateActivationKey('këy-😀')).toBe('këy-😀');
  });
});
