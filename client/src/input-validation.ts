// Non-authoritative client-side validation (T004/T005, ui.md, mirroring
// server/src/input-validation.ts's rules: no control characters, no HTML
// special characters, a fixed max length). This is UX only — surfaces inline
// feedback before submission — and never replaces or weakens the server-side
// reject (infrastructure.md Input Validation) that's the actual enforcement.

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;
const HTML_SPECIAL_CHARS = /[<>&"']/;

const DISPLAY_NAME_MAX_LENGTH = 64;
const ACTIVATION_KEY_MAX_LENGTH = 256;

/**
 * Returns a human-readable validation error for `input`, or `null` if it's
 * valid. Empty input is treated as valid here (a separate "required" check
 * already gates form submission) — this only flags the same reject
 * conditions the server enforces: control/HTML characters and over-length.
 */
export function fieldValidationError(input: string, maxLength: number, label: string): string | null {
  if (!input) return null;
  if (CONTROL_CHARS.test(input) || HTML_SPECIAL_CHARS.test(input) || input.length > maxLength) {
    return `${label} is invalid`;
  }
  return null;
}

export function displayNameError(input: string): string | null {
  return fieldValidationError(input, DISPLAY_NAME_MAX_LENGTH, 'Name');
}

export function activationKeyError(input: string): string | null {
  return fieldValidationError(input, ACTIVATION_KEY_MAX_LENGTH, 'Activation key');
}
