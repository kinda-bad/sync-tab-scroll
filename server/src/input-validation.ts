// Shared server-side input validation (infrastructure.md Input Validation
// section, feedback-input-sanitization-hardening-7a9a F001). Applied at the
// point session-create, session-join, catalogue-unlock, and Phase 2
// authoring routes handle raw client input: control characters and
// HTML/script-like content are rejected outright (not silently stripped or
// truncated), Unicode/emoji pass through unchanged (a real display-name use
// case), and a fixed max length is enforced. A value that fails validation
// is reported back to the caller as an error, never mutated and accepted.

// Control characters: C0 (0x00-0x1F) and DEL/C1 (0x7F-0x9F).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;
// HTML special characters that could form tags/entities.
const HTML_SPECIAL_CHARS = /[<>&"']/;

export type ValidationResult = { ok: true; value: string } | { ok: false };

/**
 * Generalized reject-based field validator (constitution Principle VI —
 * shared by every validation call site rather than re-implemented per
 * field). Rejects (does not sanitize/mutate) input containing control
 * characters, HTML special characters, or exceeding maxLength. Unicode/emoji
 * pass through unchanged.
 */
export function validateField(input: string, maxLength: number): ValidationResult {
  if (CONTROL_CHARS.test(input) || HTML_SPECIAL_CHARS.test(input) || input.length > maxLength) {
    return { ok: false };
  }
  return { ok: true, value: input };
}

const DISPLAY_NAME_MAX_LENGTH = 64;
const ACTIVATION_KEY_MAX_LENGTH = 256;

export function validateDisplayName(input: string): ValidationResult {
  return validateField(input, DISPLAY_NAME_MAX_LENGTH);
}

export function validateActivationKey(input: string): ValidationResult {
  return validateField(input, ACTIVATION_KEY_MAX_LENGTH);
}
