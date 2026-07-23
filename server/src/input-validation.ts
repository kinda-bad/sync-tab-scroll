// Shared server-side input validation (infrastructure.md, feedback-input-
// sanitization-hardening-7a9a F001). Applied at the point session-create,
// session-join, and catalogue-unlock handle raw client input: strips control
// characters and HTML special characters (so no tag/entity injection is
// possible downstream), caps length, and otherwise passes Unicode/emoji
// through unchanged — this is sanitization, not a rejection-only validator.

// Control characters: C0 (0x00-0x1F) and DEL/C1 (0x7F-0x9F).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
// HTML special characters that could form tags/entities.
const HTML_SPECIAL_CHARS = /[<>&"']/g;

function sanitize(input: string, maxLength: number): string {
  return input.replace(CONTROL_CHARS, '').replace(HTML_SPECIAL_CHARS, '').slice(0, maxLength);
}

const DISPLAY_NAME_MAX_LENGTH = 64;
const ACTIVATION_KEY_MAX_LENGTH = 256;

export function validateDisplayName(input: string): string {
  return sanitize(input, DISPLAY_NAME_MAX_LENGTH);
}

export function validateActivationKey(input: string): string {
  return sanitize(input, ACTIVATION_KEY_MAX_LENGTH);
}
