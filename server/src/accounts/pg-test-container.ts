import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { runMigrations } from './migrate.js';

/**
 * Containerized real-Postgres test harness (design §12.3; constitution
 * Principle VII). Prefers **podman** (user preference), falls back to
 * **docker**, and reports unavailable when neither runtime is reachable so
 * DB-backed tests can `skipIf` rather than fail on a runtime-less box — the same
 * DB-optional posture the whole feature carries.
 */

const POSTGRES_IMAGE = 'postgres:16-alpine';
const RUNTIMES = ['podman', 'docker'] as const;
type Runtime = (typeof RUNTIMES)[number];

function runtimeReady(runtime: Runtime): boolean {
  try {
    execFileSync(runtime, ['info'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** The first ready runtime (podman before docker), or null if neither is up. */
export function detectContainerRuntime(): Runtime | null {
  return RUNTIMES.find(runtimeReady) ?? null;
}

/** True when a container runtime is reachable — gate DB-backed tests on this. */
export function containerRuntimeAvailable(): boolean {
  return detectContainerRuntime() !== null;
}

export interface TestPostgres {
  connectionString: string;
  /** Stops and removes the throwaway container. */
  stop: () => void;
}

function sh(runtime: Runtime, args: string[]): string {
  return execFileSync(runtime, args, { encoding: 'utf8' }).trim();
}

/**
 * Starts a throwaway Postgres container on a random host port bound to
 * localhost, waits until it accepts connections, and returns its connection
 * string plus a `stop()` teardown. Throws if no container runtime is available
 * (callers should gate on {@link containerRuntimeAvailable}).
 */
export async function startPostgresContainer(): Promise<TestPostgres> {
  const runtime = detectContainerRuntime();
  if (!runtime) throw new Error('No container runtime (podman/docker) available for the Postgres test harness');

  const password = 'test';
  const db = 'sync_tab_scroll_test';
  const containerId = sh(runtime, [
    'run',
    '-d',
    '--rm',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-e',
    `POSTGRES_DB=${db}`,
    '-p',
    '127.0.0.1::5432',
    POSTGRES_IMAGE,
  ]);

  const stop = () => {
    try {
      execFileSync(runtime, ['stop', '-t', '1', containerId], { stdio: 'ignore' });
    } catch {
      // best-effort teardown — --rm removes it on stop
    }
  };

  try {
    // `<runtime> port <id> 5432` → e.g. "127.0.0.1:54321" (podman may print
    // "0.0.0.0:54321"); take the last line and its port.
    const mapping = sh(runtime, ['port', containerId, '5432']).split('\n').pop() ?? '';
    const hostPort = mapping.split(':').pop();
    if (!hostPort) throw new Error(`Could not parse mapped port from "${mapping}"`);

    const connectionString = `postgresql://postgres:${password}@127.0.0.1:${hostPort}/${db}`;
    await waitForPostgres(connectionString);
    return { connectionString, stop };
  } catch (err) {
    stop();
    throw err;
  }
}

async function waitForPostgres(connectionString: string, attempts = 60): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 1000 });
    try {
      await pool.query('SELECT 1');
      await pool.end();
      return;
    } catch {
      await pool.end().catch(() => {});
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Postgres container did not become ready in time');
}

/**
 * Brings up a throwaway Postgres, applies the T004 migrations, hands a `Pool` to
 * `fn`, and tears the container down afterward (even on failure). The one-liner
 * every DB-backed test uses.
 */
export async function withTestDatabase<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
  const pg = await startPostgresContainer();
  const pool = new Pool({ connectionString: pg.connectionString });
  try {
    await runMigrations(pool);
    return await fn(pool);
  } finally {
    await pool.end().catch(() => {});
    pg.stop();
  }
}
