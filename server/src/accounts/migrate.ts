import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export interface Migration {
  /** Filename, e.g. `0001_account_layer.sql`; lexical order IS apply order. */
  version: string;
  sql: string;
}

/**
 * Reads the ordered `*.sql` migrations from the sibling `migrations/` directory
 * (copied into `dist/` by the server build so it resolves in production too).
 * DB-free — the T004 structural test asserts on these directly.
 */
export function loadMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((version) => ({ version, sql: readFileSync(path.join(MIGRATIONS_DIR, version), 'utf8') }));
}

/**
 * Applies any not-yet-applied migrations in order, each in its own transaction,
 * tracking applied versions in a `schema_migrations` table so re-running is
 * idempotent. Used by the container test harness (T005) and at server boot when
 * a `DATABASE_URL` is configured (T006).
 */
export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at bigint NOT NULL)',
  );
  const applied = new Set<string>(
    (await pool.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map((r) => r.version),
  );

  for (const { version, sql } of loadMigrations()) {
    if (applied.has(version)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)', [version, Date.now()]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
