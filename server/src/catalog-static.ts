import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const URL_PREFIX = '/catalog/';

const CONTENT_TYPES: Record<string, string> = {
  '.gp': 'application/octet-stream',
  '.lrc': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
};

/**
 * Serves files under catalogRoot at /catalog/<path> (infrastructure.md
 * "Song Catalog Delivery"). Returns true if it handled the request (even
 * with a 404), false if the path isn't under /catalog/ at all, so the
 * caller can fall through to its own 404 handling.
 */
export function createCatalogRequestHandler(catalogRoot: string) {
  const root = path.resolve(catalogRoot);

  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? '';
    if (!url.startsWith(URL_PREFIX)) return false;

    const relative = decodeURIComponent(url.slice(URL_PREFIX.length).split('?')[0]);
    const resolved = path.resolve(root, relative);
    // Reject any resolved path that escapes catalogRoot (traversal safety) —
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
