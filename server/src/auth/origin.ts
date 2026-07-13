/**
 * WS-upgrade Origin allowlist (§13 S3; infrastructure.md WebSocket upgrade
 * hardening). Cookies ride the WS handshake even cross-site, so the Origin must
 * be validated **before** the cookie is read — `SameSite=Lax` is not the sole
 * CSRF defense. The allowlist is intentionally derived, not a new env key:
 *
 * - The app's own public origin (prod's `wss://<host>` upgrade carries
 *   `Origin: https://<host>` = `publicBaseUrl`).
 * - Any `localhost` / `127.0.0.1` origin, for dev / e2e / preview (harmless in
 *   prod — a localhost page can't hold the prod host's Secure cookie).
 * - A missing Origin (non-browser clients omit it; only browsers enforce it).
 *
 * A foreign origin — the CSRF case — is rejected.
 */
export function isOriginAllowed(origin: string | undefined, publicBaseUrl: string): boolean {
  if (!origin) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;

  try {
    const publicOrigin = new URL(publicBaseUrl).origin;
    if (parsed.origin === publicOrigin) return true;
  } catch {
    // publicBaseUrl misconfigured — fall through to reject the foreign origin.
  }

  return false;
}
