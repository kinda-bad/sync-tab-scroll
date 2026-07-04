import { existsSync, readFileSync } from 'node:fs';

function parseKeys(path) {
  if (!existsSync(path)) return null;
  return new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0].trim()),
  );
}

/**
 * Compares an app's .env against its committed .env.example. An absent
 * .env passes trivially (a fresh clone/CI genuinely has no .env — it's
 * git-ignored — so there's nothing to drift against).
 */
export function diffEnvKeys(envPath, examplePath) {
  const envKeys = parseKeys(envPath);
  const exampleKeys = parseKeys(examplePath) ?? new Set();

  if (envKeys === null) {
    return { missingFromEnv: [], missingFromExample: [] };
  }

  return {
    missingFromEnv: [...exampleKeys].filter((k) => !envKeys.has(k)),
    missingFromExample: [...envKeys].filter((k) => !exampleKeys.has(k)),
  };
}

function main() {
  const [envPath, examplePath] = process.argv.slice(2);
  if (!envPath || !examplePath) {
    console.error('Usage: check-env-parity.mjs <.env path> <.env.example path>');
    process.exit(2);
  }

  const { missingFromEnv, missingFromExample } = diffEnvKeys(envPath, examplePath);

  if (missingFromEnv.length === 0 && missingFromExample.length === 0) {
    process.exit(0);
  }

  console.error(`Key shape mismatch between ${envPath} and ${examplePath}:`);
  if (missingFromEnv.length > 0) {
    console.error(`  In ${examplePath} but missing from ${envPath}: ${missingFromEnv.join(', ')}`);
  }
  if (missingFromExample.length > 0) {
    console.error(`  In ${envPath} but missing from ${examplePath}: ${missingFromExample.join(', ')}`);
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
