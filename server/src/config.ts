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
  /** Gate catalog loading on a per-song consent record (datamodel.md Consent Record). Off by default — a local/personal catalog needs no consent; only a public deployment should set this. */
  requireSongConsent: boolean;
  /** Built client SPA root served as a static fallback (infrastructure.md "Deployment (Railway + Terraform)"). Unused in local dev, where the client runs its own Vite dev server instead — a missing/nonexistent path here just means every request 404s through client-static.ts, harmlessly. */
  clientRoot: string;
  /** Optional OAuth account layer (infrastructure.md User Accounts). */
  account: AccountConfig;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 6080),
    catalogRoot: process.env.CATALOG_ROOT ?? './catalog',
    hostReassignGraceMs: Number(process.env.HOST_REASSIGN_GRACE_MS ?? 120_000),
    requireSongConsent: process.env.REQUIRE_SONG_CONSENT === 'true',
    clientRoot: process.env.CLIENT_ROOT ?? '../client/dist',
    account: {
      // Empty string is treated as unset (accounts disabled) — the factory's
      // `!databaseUrl` selects the null store either way (design §2).
      databaseUrl: process.env.DATABASE_URL || undefined,
      sessionCookieSecret: process.env.SESSION_COOKIE_SECRET ?? '',
      publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:6000',
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
