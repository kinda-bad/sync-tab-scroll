import { describe, expect, it } from 'vitest';
import { validateDisplayName, validateActivationKey, validateField } from './input-validation.js';

// T007: validateField is the generalized reject-based helper that
// validateDisplayName/validateActivationKey (and every Phase 2 authoring
// call site) share, rather than re-implementing the same control/HTML-char/
// length check per field (constitution Principle VI).
describe('validateField', () => {
  it('rejects control characters', () => {
    expect(validateField('a\x00b', 64)).toEqual({ ok: false });
  });

  it('rejects HTML special characters', () => {
    expect(validateField('<tag>', 64)).toEqual({ ok: false });
  });

  it('rejects input exceeding the given maxLength', () => {
    expect(validateField('abcdef', 5)).toEqual({ ok: false });
  });

  it('accepts valid Unicode/emoji input within maxLength unchanged', () => {
    expect(validateField('slug-😀', 64)).toEqual({ ok: true, value: 'slug-😀' });
  });
});

// T001: shared server-side input validation for displayName/activation-key
// input (feedback-input-sanitization-hardening-7a9a F001, infrastructure.md
// Input Validation). Rejects (does not sanitize/mutate) control characters,
// HTML special characters, and over-length input; passes Unicode/emoji
// through unchanged.

describe('validateDisplayName', () => {
  it('rejects control characters', () => {
    expect(validateDisplayName('Alice\x00\x07Bob')).toEqual({ ok: false });
  });

  it('rejects HTML special characters', () => {
    expect(validateDisplayName('<script>alert(1)</script>Alice')).toEqual({ ok: false });
  });

  it('rejects input exceeding the length cap', () => {
    const long = 'a'.repeat(500);
    expect(validateDisplayName(long)).toEqual({ ok: false });
  });

  it('accepts Unicode/emoji unchanged', () => {
    expect(validateDisplayName('Ada 😀 Ünïcode')).toEqual({ ok: true, value: 'Ada 😀 Ünïcode' });
  });

  it('accepts plain valid input unchanged', () => {
    expect(validateDisplayName('Alice')).toEqual({ ok: true, value: 'Alice' });
  });
});

describe('validateActivationKey', () => {
  it('rejects control characters', () => {
    expect(validateActivationKey('abc\x00def')).toEqual({ ok: false });
  });

  it('rejects HTML special characters', () => {
    expect(validateActivationKey('<b>key</b>')).toEqual({ ok: false });
  });

  it('rejects input exceeding the length cap', () => {
    const long = 'k'.repeat(500);
    expect(validateActivationKey(long)).toEqual({ ok: false });
  });

  it('accepts Unicode/emoji unchanged', () => {
    expect(validateActivationKey('këy-😀')).toEqual({ ok: true, value: 'këy-😀' });
  });

  it('accepts plain valid input unchanged', () => {
    expect(validateActivationKey('secret-key-123')).toEqual({ ok: true, value: 'secret-key-123' });
  });
});
