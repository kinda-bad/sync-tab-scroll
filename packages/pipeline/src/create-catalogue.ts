import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export type CatalogueVisibility = 'public' | 'private';

/**
 * Creates a catalogue directory under `catalogRoot` (pipeline.md's Inputs &
 * Outputs On Disk). A `private` catalogue writes a `catalogue.json` gate
 * record (datamodel.md Catalogue Activation Key) holding the display
 * `name`, a random per-catalogue `salt`, and `scrypt(key, salt, 64)` — the
 * raw activation key itself is never written to disk, only hashed. A
 * `public` catalogue creates the directory alone, with no `catalogue.json`
 * (the loader treats the absence of that record as the public signal —
 * datamodel.md Catalogue).
 *
 * `scryptSync` is used deliberately: this runs once, interactively, in a
 * short-lived CLI process on the operator's own machine, not in the
 * server's request path, so blocking the event loop briefly is fine.
 */
export function createCatalogue(catalogRoot: string, slug: string, name: string, visibility: CatalogueVisibility, key?: string): void {
  const catalogueDir = path.join(catalogRoot, slug);
  fs.mkdirSync(catalogueDir, { recursive: true });

  if (visibility === 'public') return;

  if (!key) {
    throw new Error('A private catalogue requires an activation key');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(key, salt, 64).toString('hex');

  const record = { name, salt, hash };
  fs.writeFileSync(path.join(catalogueDir, 'catalogue.json'), JSON.stringify(record, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  const [catalogRoot, slug, name, visibilityArg, key] = process.argv.slice(2);
  if (!catalogRoot || !slug || !name || (visibilityArg !== 'public' && visibilityArg !== 'private')) {
    console.error('Usage: create-catalogue <catalogRoot> <slug> <name> <public|private> [key]');
    process.exit(1);
  }
  if (visibilityArg === 'private' && !key) {
    console.error('A private catalogue requires an activation key: create-catalogue <catalogRoot> <slug> <name> private <key>');
    process.exit(1);
  }
  createCatalogue(catalogRoot, slug, name, visibilityArg, key);
  console.log(`Created ${visibilityArg} catalogue ${slug} (${catalogRoot})`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
