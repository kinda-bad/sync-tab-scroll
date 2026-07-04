import * as fs from 'node:fs';
import * as path from 'node:path';

/** Companion consent record for a public-deployment song (datamodel.md Consent Record). Never sent to any client. */
export interface ConsentRecord {
  submitterName: string;
  tosVersion: string;
  acceptedAt: number;
}

function isConsentRecord(value: unknown): value is ConsentRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.submitterName === 'string' && typeof v.tosVersion === 'string' && typeof v.acceptedAt === 'number';
}

/** Reads `<songDir>/consent.json` and validates it against the ConsentRecord shape (infrastructure.md Song Consent Gate). */
export function hasConsent(songDir: string): boolean {
  const consentPath = path.join(songDir, 'consent.json');
  if (!fs.existsSync(consentPath)) return false;

  try {
    const parsed = JSON.parse(fs.readFileSync(consentPath, 'utf8'));
    return isConsentRecord(parsed);
  } catch {
    return false;
  }
}
