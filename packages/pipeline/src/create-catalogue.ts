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

  // epoch starts at 1 (datamodel.md Catalogue Activation Key); rotating the key
  // bumps it, stranding memberships redeemed under an older epoch (§13 S5).
  const record = { name, salt, hash, epoch: 1 };
  fs.writeFileSync(path.join(catalogueDir, 'catalogue.json'), JSON.stringify(record, null, 2) + '\n', 'utf8');
}

/**
 * Rotates a private catalogue's activation key (datamodel.md; §13 S5):
 * regenerates `salt`/`hash` for `newKey` and **bumps `epoch`** (an absent epoch
 * on a legacy record is treated as `1`, so it becomes `2`). Bumping the epoch is
 * what actually revokes previously-redeemed leaked-key access — a durable
 * `CatalogueMembership` granted under the old epoch no longer matches. Throws if
 * the catalogue doesn't exist or is public (no key record to rotate).
 */
export function rotateCatalogueKey(catalogRoot: string, slug: string, newKey: string): void {
  const catalogueJsonPath = path.join(catalogRoot, slug, 'catalogue.json');
  if (!fs.existsSync(catalogueJsonPath)) {
    throw new Error(`No private catalogue.json to rotate at ${catalogueJsonPath} (a public catalogue has no key).`);
  }
  const existing = JSON.parse(fs.readFileSync(catalogueJsonPath, 'utf8')) as { name: string; epoch?: number };

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(newKey, salt, 64).toString('hex');
  const record = { name: existing.name, salt, hash, epoch: (existing.epoch ?? 1) + 1 };
  fs.writeFileSync(catalogueJsonPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // `rotate` subcommand: create-catalogue rotate <catalogRoot> <slug> <newKey>
  if (args[0] === 'rotate') {
    const [, catalogRoot, slug, newKey] = args;
    if (!catalogRoot || !slug || !newKey) {
      console.error('Usage: create-catalogue rotate <catalogRoot> <slug> <newKey>');
      process.exit(1);
    }
    rotateCatalogueKey(catalogRoot, slug, newKey);
    console.log(`Rotated activation key for catalogue ${slug} (${catalogRoot}) — epoch bumped, old key-grants stranded`);
    return;
  }

  const [catalogRoot, slug, name, visibilityArg, key] = args;
  if (!catalogRoot || !slug || !name || (visibilityArg !== 'public' && visibilityArg !== 'private')) {
    console.error('Usage: create-catalogue <catalogRoot> <slug> <name> <public|private> [key]');
    console.error('       create-catalogue rotate <catalogRoot> <slug> <newKey>');
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
