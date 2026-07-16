import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extractLyrics } from '@sync-tab-scroll/pipeline';
import type { AccountStore } from './accounts/store.js';
import { resolveUserIdFromCookie } from './auth/session.js';
import { rescanAndBroadcastCatalog } from './authoring-rescan.js';
import type { HandlerContext } from './handlers/context.js';

const ROUTE = /^\/catalogues\/([^/]+)\/songs$/;

/** Hard ceiling on the raw upload body (infrastructure.md Upload trust surface, "a request body size limit") — a `.gp` file is a small zip; nothing legitimate needs to be this large. */
const DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MiB

/** Hard ceiling on the pipeline extraction stage (infrastructure.md, "a parse timeout ... must not be allowed to hang the request indefinitely"). */
const DEFAULT_PARSE_TIMEOUT_MS = 30_000;

export interface SongUploadRouteOptions {
  store: AccountStore;
  /** The LIVE catalog root — staging never writes here until a validated result is moved in. */
  catalogRoot: string;
  /** Present in production; omitted only by the T008-scoped auth-gate tests, which never reach the file-handling path. */
  ctx?: HandlerContext;
  requireSongConsent?: boolean;
  maxUploadBytes?: number;
  parseTimeoutMs?: number;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.setHeader('content-type', 'application/json');
  res.writeHead(status).end(JSON.stringify(body));
}

/** Removes a directory tree, swallowing errors — staging cleanup is best-effort; a leftover temp dir is disk-space debt, never a correctness issue (it's never linked into the live catalog). */
function cleanup(dir: string): void {
  fs.rm(dir, { recursive: true, force: true }, () => {});
}

/**
 * Drains `req` into a staged temp file, enforcing `maxUploadBytes` DURING the
 * stream — not just via a `Content-Length` header check, which a malicious or
 * buggy client can omit or lie about (infrastructure.md "a request body size
 * limit"). The moment the running byte count exceeds the limit, the request
 * socket is destroyed and the partial temp file is deleted: an oversized
 * upload is rejected before it is ever fully buffered or written anywhere
 * durable (T009's exact test requirement).
 */
function stageUpload(req: IncomingMessage, destPath: string, maxUploadBytes: number): Promise<{ ok: true } | { ok: false; reason: 'too-large' | 'stream-error' }> {
  return new Promise((resolve) => {
    let bytes = 0;
    let settled = false;
    const out = fs.createWriteStream(destPath);

    const fail = (reason: 'too-large' | 'stream-error') => {
      if (settled) return;
      settled = true;
      out.destroy();
      // Stop reading further body data and discard whatever arrives after
      // this point — but deliberately DON'T destroy the socket: the caller
      // still needs to send the 413/400 response on it. `resume()` drains
      // the remainder so the connection can be cleanly reused/closed once
      // the response is written, instead of hanging half-read.
      req.removeAllListeners('data');
      req.resume();
      fs.rm(destPath, { force: true }, () => {});
      resolve({ ok: false, reason });
    };

    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxUploadBytes) {
        fail('too-large');
        return;
      }
      // Backpressure-unaware write is fine here: bodies are capped at
      // maxUploadBytes (a few tens of MB at most), never large enough for
      // buffered-write memory pressure to matter.
      out.write(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      out.end(() => resolve({ ok: true }));
    });
    req.on('error', () => fail('stream-error'));
    out.on('error', () => fail('stream-error'));
  });
}

/** `<artist>-<title>-MM-DD-YYYY.gp` — the filename shape `extractLyrics`'s `parseSongFilename` requires (pipeline.md), built from the submitted metadata rather than an attacker-controlled original filename. */
function buildStagedFilename(artist: string, title: string): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  return `${artist}-${title}-${mm}-${dd}-${yyyy}.gp`;
}

/**
 * Races a promise against a timeout, WITHOUT cancelling the underlying work
 * (`extractLyrics` accepts no `AbortSignal` — reusing it as-is per
 * infrastructure.md, not forking a cancellable copy). On timeout, resolves
 * `{ ok: false, reason: 'timeout' }` so the caller moves on immediately
 * (never hangs the HTTP response past the deadline); a late completion is
 * silently dropped (never resolves/rejects the returned promise a second
 * time), so a slow/hung extraction can delay disk cleanup but can never
 * reach the live catalog past the deadline. A genuine rejection from
 * `promise` (a real parse error, not a timeout) is re-thrown as-is — kept
 * DISTINCT from a timeout, so the caller's own try/catch reports "malformed
 * upload" rather than misreporting a parse error as a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<{ ok: true; value: T } | { ok: false; reason: 'timeout' }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, reason: 'timeout' });
    }, ms);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: true, value });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Mounts `POST /catalogues/:catalogueId/songs` — the authenticated,
 * owner-only, in-app song-upload trust surface (infrastructure.md "In-App
 * Authoring" / "Upload trust surface"; T008/T009/T010). Gate one:
 * `CatalogueOwnership` (403 for a non-owner, 401 for anonymous). Gate two,
 * independent of who's uploading: a request body size limit and a staged,
 * never-live-until-validated write, and a parse timeout on the pipeline's
 * extraction stage — defending against a legitimate owner's account
 * submitting a malformed or oversized file, deliberately or not. On success,
 * the validated song directory is moved from staging into the live catalog
 * and `rescanAndBroadcastCatalog` fires; on ANY failure (oversized, malformed
 * upload, parse error, timeout), the staged file/output is discarded and
 * nothing reaches the live catalog directory or triggers a re-broadcast.
 */
export function createSongUploadRequestHandler(opts: SongUploadRouteOptions): (req: IncomingMessage, res: ServerResponse) => boolean {
  const { store, catalogRoot, ctx, requireSongConsent = false, maxUploadBytes = DEFAULT_MAX_UPLOAD_BYTES, parseTimeoutMs = DEFAULT_PARSE_TIMEOUT_MS } = opts;

  async function handle(catalogueId: string, req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const userId = await resolveUserIdFromCookie(store, req.headers.cookie);
    if (!userId) {
      json(res, 401, { error: 'sign in required' });
      req.resume(); // drain/discard any body the client sends anyway
      return;
    }

    const isOwner = await store.isOwner(catalogueId, userId);
    if (!isOwner) {
      json(res, 403, { error: 'not an owner of this catalogue' });
      req.resume();
      return;
    }

    const artist = url.searchParams.get('artist')?.trim();
    const title = url.searchParams.get('title')?.trim();
    if (!artist || !title) {
      json(res, 400, { error: 'artist and title query params are required' });
      req.resume();
      return;
    }

    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-upload-'));
    const stagingCatalogRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sts-upload-catalog-'));
    try {
      const gpPath = path.join(stagingRoot, buildStagedFilename(artist, title));
      const staged = await stageUpload(req, gpPath, maxUploadBytes);
      if (!staged.ok) {
        json(res, staged.reason === 'too-large' ? 413 : 400, { error: staged.reason === 'too-large' ? 'upload too large' : 'upload stream error' });
        return;
      }

      // On timeout, `raced.ok` is false and we return here — the move step
      // below never runs, so a late-resolving extraction (if it ever
      // completes) can only write into the now-orphaned staging dirs this
      // function's `finally` cleans up, never into the live catalog.
      const raced = await withTimeout(extractLyrics(gpPath, stagingCatalogRoot), parseTimeoutMs);
      if (!raced.ok) {
        json(res, 504, { error: 'pipeline parse timed out' });
        return;
      }

      // extractLyrics succeeded — move its staged output (never the live
      // catalog until this point) into the real catalog directory.
      const songSlug = fs.readdirSync(stagingCatalogRoot)[0];
      if (!songSlug) {
        json(res, 500, { error: 'pipeline produced no output' });
        return;
      }
      fs.mkdirSync(catalogRoot, { recursive: true });
      const destDir = path.join(catalogRoot, songSlug);
      fs.rmSync(destDir, { recursive: true, force: true }); // re-upload of the same song overwrites cleanly
      fs.renameSync(path.join(stagingCatalogRoot, songSlug), destDir);

      if (ctx) rescanAndBroadcastCatalog(ctx, catalogRoot, requireSongConsent);

      json(res, 200, { ok: true, songId: songSlug });
    } catch (err) {
      // Malformed .gp / parse error (T010's other required failure mode):
      // nothing was moved into the live catalog — only staging is touched.
      console.error('[song-upload] pipeline extraction failed:', err instanceof Error ? err.message : err);
      json(res, 400, { error: 'malformed or unparseable upload' });
    } finally {
      // Fallback net: every explicit branch above already sent a response;
      // this only fires if some future edit adds a branch that forgets to.
      if (!res.headersSent) json(res, 500, { error: 'internal error' });
      cleanup(stagingRoot);
      cleanup(stagingCatalogRoot);
    }
  }

  return (req, res) => {
    if (req.method !== 'POST') return false;
    const url = new URL(req.url ?? '/', 'http://localhost');
    const m = url.pathname.match(ROUTE);
    if (!m) return false;

    handle(decodeURIComponent(m[1]), req, res, url).catch((err) => {
      console.error('[song-upload] route error:', err instanceof Error ? err.message : err);
      if (!res.headersSent) res.writeHead(500).end();
    });
    return true;
  };
}
