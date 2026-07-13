import { describe, expect, it } from 'vitest';
import { containerRuntimeAvailable, withTestDatabase } from './pg-test-container.js';

/**
 * The containerized-Postgres test harness (design §12.3; podman preferred,
 * docker fallback). Skips cleanly when no container runtime is reachable so the
 * DB-optional suite still passes in a runtime-less CI/dev box — matching the
 * whole feature's "runs with no DB" posture.
 */
describe.skipIf(!containerRuntimeAvailable())('pg test harness (T005)', () => {
  it(
    'brings a throwaway Postgres up, applies migrations, and a trivial query succeeds',
    async () => {
      await withTestDatabase(async (pool) => {
        const { rows } = await pool.query<{ one: number }>('SELECT 1 AS one');
        expect(rows[0].one).toBe(1);

        // The harness applied the T004 migrations on the way up.
        const applied = await pool.query<{ version: string }>('SELECT version FROM schema_migrations');
        expect(applied.rows.map((r) => r.version)).toContain('0001_account_layer.sql');
      });
    },
    120_000,
  );
});
