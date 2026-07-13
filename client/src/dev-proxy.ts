/**
 * The dev/preview proxy map (single source of truth, used by both `server` and
 * `preview` in `vite.config.ts`). `/catalog` keeps catalog assets same-origin;
 * `/auth/*` and `/me` keep the OAuth redirect dance and the session cookie
 * same-origin in dev (design §6 dev-mode wrinkle) — the page is served by Vite,
 * so these must forward to the backend just as `/catalog` does.
 */
export function accountDevProxy(backendPort: string): Record<string, string> {
  const target = `http://localhost:${backendPort}`;
  return {
    '/catalog': target,
    '/auth': target,
    '/me': target,
  };
}
