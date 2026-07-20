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
    const size = fs.statSync(resolved).size;

    // HTTP Range support (infrastructure.md). An <audio> element seeks by
    // issuing a `Range` request and requires 206 Partial Content with a correct
    // Content-Range to honor it. A missing or unparseable Range falls through to
    // a full 200 (never 416 on garbage). `Accept-Ranges: bytes` is advertised on
    // both the full and partial responses so the element knows seeking is
    // available. Byte offsets in Content-Range are inclusive on both ends.
    const range = parseRange(req.headers.range, size);
    if (range === 'unsatisfiable') {
      res.writeHead(416, { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' });
      res.end();
      return true;
    }

    if (range) {
      const { start, end } = range;
      res.writeHead(206, {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      });
      fs.createReadStream(resolved, { start, end }).pipe(res);
      return true;
    }

    res.writeHead(200, { 'Content-Type': contentType, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(resolved).pipe(res);
    return true;
  };
}

/**
 * Parses a single-range `Range: bytes=start-end` header against a known file
 * `size`. Returns inclusive `{ start, end }` byte offsets for a satisfiable
 * range, the literal `'unsatisfiable'` when the range is well-formed but starts
 * at/after EOF (→ 416), or `undefined` when the header is absent or not a form
 * we honor (→ fall through to a full 200). Only the single-range `bytes=` form
 * is supported — sufficient for `<audio>` seeking; multi-range is not.
 */
function parseRange(
  header: string | string[] | undefined,
  size: number,
): { start: number; end: number } | 'unsatisfiable' | undefined {
  if (typeof header !== 'string') return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return undefined;

  const [, rawStart, rawEnd] = match;
  // A suffix range (`bytes=-N`, empty start) is a valid form but not needed for
  // seeking; treat it as unhandled and serve the full body.
  if (rawStart === '') return undefined;

  const start = Number(rawStart);
  const end = rawEnd === '' ? size - 1 : Number(rawEnd);

  if (start >= size) return 'unsatisfiable';
  if (end < start) return undefined;

  return { start, end: Math.min(end, size - 1) };
}
