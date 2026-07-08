export interface ServerConfig {
  port: number;
  catalogRoot: string;
  /** How long the host can stay disconnected before the longest-tenured connected participant is promoted (infrastructure.md Host Succession). Configurable mainly for fast tests — production default is 2 minutes. */
  hostReassignGraceMs: number;
  /** Gate catalog loading on a per-song consent record (datamodel.md Consent Record). Off by default — a local/personal catalog needs no consent; only a public deployment should set this. */
  requireSongConsent: boolean;
}

// DELIBERATE-CI-BREAKAGE: temporary type error to verify T007 (workflow goes red).
const __ci_verification_breakage: number = 'this is a string, not a number';

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 6080),
    catalogRoot: process.env.CATALOG_ROOT ?? './catalog',
    hostReassignGraceMs: Number(process.env.HOST_REASSIGN_GRACE_MS ?? 120_000),
    requireSongConsent: process.env.REQUIRE_SONG_CONSENT === 'true',
  };
}
