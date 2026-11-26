const REPO_URL = 'https://github.com/kinda-bad/sync-tab-scroll';

export interface BuildInfo {
  /** What the version mark shows: a short commit hash, or `dev`. */
  label: string;
  /** The commit on GitHub, or null for a build with no commit baked in. */
  url: string | null;
}

/**
 * The app has no release numbers, so its version is the commit it was built
 * from. `commit` comes from `VITE_APP_COMMIT`, which vite.config.ts fills in
 * at build time (see there); anything that is not a commit hash, including a
 * missing value, is reported as a dev build.
 */
export function describeBuild(commit: string | undefined): BuildInfo {
  if (!commit || !/^[0-9a-f]{7,40}$/.test(commit)) return { label: 'dev', url: null };
  return { label: commit.slice(0, 7), url: `${REPO_URL}/commit/${commit}` };
}

export const buildInfo = describeBuild(import.meta.env.VITE_APP_COMMIT);
