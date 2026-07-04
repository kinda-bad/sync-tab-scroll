import * as fs from 'node:fs';
import * as path from 'node:path';

// PRODUCTION ANNOTATION: this placeholder ToS version string stands in for
// the operator's real distribution-license clause text/version, which is a
// legal decision this plan doesn't resolve (datamodel.md Consent Record —
// "[OPEN: exact ToS wording is a legal decision, not a design one]"). Must
// be replaced with the actual accepted ToS version before any public
// deployment relies on recorded consent for real.
const TOS_VERSION_PLACEHOLDER = 'dev-placeholder';

/**
 * Writes a consent record (datamodel.md Consent Record) into an existing
 * song's catalog directory, additive to the pipeline's normal extraction
 * outputs (pipeline.md Consent Recording) — it never touches meta.json,
 * the .gp file, or lyrics.lrc.
 */
export function recordConsent(catalogRoot: string, songSlug: string, submitterName: string): void {
  const songDir = path.join(catalogRoot, songSlug);
  if (!fs.existsSync(songDir)) {
    throw new Error(`Song directory does not exist: ${songDir}`);
  }

  const record = {
    submitterName,
    tosVersion: TOS_VERSION_PLACEHOLDER,
    acceptedAt: Date.now(),
  };

  fs.writeFileSync(path.join(songDir, 'consent.json'), JSON.stringify(record, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  const [catalogRoot, songSlug, submitterName] = process.argv.slice(2);
  if (!catalogRoot || !songSlug || !submitterName) {
    console.error('Usage: record-consent <catalogRoot> <songSlug> <submitterName>');
    process.exit(1);
  }
  recordConsent(catalogRoot, songSlug, submitterName);
  console.log(`Recorded consent for ${songSlug} (${catalogRoot})`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
