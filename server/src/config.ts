/** OAuth client credentials for one provider (never committed — placeholders in `.env.example`). */
export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Optional account-layer config (constitution v1.5.0; infrastructure.md User
 * Accounts). ALL optional: with `databaseUrl` unset the whole account layer
 * self-disables (design §2). Real secrets live in 1Password / sealed Railway
 * vars, never here.
 */
export interface AccountConfig {
  /** Postgres connection string; `undefined`/empty ⇒ accounts disabled (null store). */
  databaseUrl: string | undefined;
  /** Secret used to sign the OAuth transaction cookie (§13 S1). */
  sessionCookieSecret: string;
  /** Public origin the app is reached at — used to build OAuth `redirect_uri` and the post-login redirect (design §6). */
  publicBaseUrl: string;
  google: OAuthClientConfig;
  github: OAuthClientConfig;
}

export interface ServerConfig {
  port: number;
  catalogRoot: string;
  /** How long the host can stay disconnected before the longest-tenured connected participant is promoted (infrastructure.md Host Succession). Configurable mainly for fast tests — production default is 2 minutes. */
  hostReassignGraceMs: number;
  /** How long an empty session (no connected participants) survives before destruction (infrastructure.md session lifecycle). An idle TTL, not a reconnect grace: default 12 hours so a band can break and resume the same session. Small values are for tests only. */
  sessionEmptyTtlMs: number;
  /** Gate catalog loading on a per-song consent record (datamodel.md Consent Record). Off by default — a local/personal catalog needs no consent; only a public deployment should set this. */
  requireSongConsent: boolean;
  /**
   * Gates the in-app song-upload route's availability (T014; infrastructure.md
   * "Consent gating (build vs. ship)") — the mechanism itself is always built,
   * this only controls whether the public deployment may accept traffic on it
   * before real ToS text replaces the Consent Record's `dev-placeholder`
   * (datamodel.md Production Annotations). Default `true` (enabled) so a
   * self-hosted/local deployment with the var unset works immediately, mirroring
   * `REQUIRE_SONG_CONSENT`'s existing self-hosted-vs-public-deployment split
   * (Song Consent Gate) but inverted: this flag defaults ON, and it's the public
   * deployment's Terraform config that must explicitly set it to `false` until
   * real ToS text is supplied.
   */
  songUploadEnabled: boolean;
  /** Built client SPA root served as a static fallback (infrastructure.md "Deployment (Railway + Terraform)"). Unused in local dev, where the client runs its own Vite dev server instead — a missing/nonexistent path here just means every request 404s through client-static.ts, harmlessly. */
  clientRoot: string;
  /**
   * Dev convenience only: pre-unlocks every private catalogue for every
   * session at creation, skipping the activation-key prompt. Off by default
   * — never set this on a public/shared deployment, since it defeats the
   * catalogue activation-key gate entirely.
   */
  devUnlockAllCatalogues: boolean;
  /** Optional OAuth account layer (infrastructure.md User Accounts). */
  account: AccountConfig;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 6080),
    catalogRoot: process.env.CATALOG_ROOT ?? './catalog',
    hostReassignGraceMs: Number(process.env.HOST_REASSIGN_GRACE_MS ?? 120_000),
    sessionEmptyTtlMs: Number(process.env.SESSION_EMPTY_TTL_MS ?? 43_200_000),
    requireSongConsent: process.env.REQUIRE_SONG_CONSENT === 'true',
    songUploadEnabled: process.env.SONG_UPLOAD_ENABLED !== 'false',
    clientRoot: process.env.CLIENT_ROOT ?? '../client/dist',
    devUnlockAllCatalogues: process.env.DEV_UNLOCK_ALL_CATALOGUES === 'true',
    account: {
      // Empty string is treated as unset (accounts disabled) — the factory's
      // `!databaseUrl` selects the null store either way (design §2).
      databaseUrl: process.env.DATABASE_URL || undefined,
      sessionCookieSecret: process.env.SESSION_COOKIE_SECRET ?? '',
      publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:6100',
      google: {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
      },
      github: {
        clientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? '',
        clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? '',
      },
    },
  };
}
