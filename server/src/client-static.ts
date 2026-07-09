import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const CATALOG_PREFIX = '/catalog/';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Serves the built client SPA (`client/dist`) as a static fallback route
 * (infrastructure.md "Deployment (Railway + Terraform)"), following
 * `catalog-static.ts`'s exact pattern. Returns false (not handled) for any
 * `/catalog/...` path — that stays owned by the catalog handler regardless
 * of wiring order — and for the root path serves `index.html`. Returns
 * true (even for a 404) for everything else under `clientRoot`, so the
 * caller can fall through to its own 404 handling only when this returns
 * false.
 */
export function createClientStaticRequestHandler(clientRoot: string) {
  const root = path.resolve(clientRoot);

  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? '';
    if (url.startsWith(CATALOG_PREFIX)) return false;

    const pathname = decodeURIComponent(url.split('?')[0]);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const resolved = path.resolve(root, relative);
    // Reject any resolved path that escapes clientRoot (traversal safety) —
    // must check after resolving, since `..` segments are only visible pre-normalization.
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      res.writeHead(404).end();
      return true;
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      res.writeHead(404).end();
      return true;
    }

    const contentType = CONTENT_TYPES[path.extname(resolved)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(resolved).pipe(res);
    return true;
  };
}
