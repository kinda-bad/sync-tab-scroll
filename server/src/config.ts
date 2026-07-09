export interface ServerConfig {
  port: number;
  catalogRoot: string;
  /** How long the host can stay disconnected before the longest-tenured connected participant is promoted (infrastructure.md Host Succession). Configurable mainly for fast tests — production default is 2 minutes. */
  hostReassignGraceMs: number;
  /** Gate catalog loading on a per-song consent record (datamodel.md Consent Record). Off by default — a local/personal catalog needs no consent; only a public deployment should set this. */
  requireSongConsent: boolean;
  /** Built client SPA root served as a static fallback (infrastructure.md "Deployment (Railway + Terraform)"). Unused in local dev, where the client runs its own Vite dev server instead — a missing/nonexistent path here just means every request 404s through client-static.ts, harmlessly. */
  clientRoot: string;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 6080),
    catalogRoot: process.env.CATALOG_ROOT ?? './catalog',
    hostReassignGraceMs: Number(process.env.HOST_REASSIGN_GRACE_MS ?? 120_000),
    requireSongConsent: process.env.REQUIRE_SONG_CONSENT === 'true',
    clientRoot: process.env.CLIENT_ROOT ?? '../client/dist',
  };
}
