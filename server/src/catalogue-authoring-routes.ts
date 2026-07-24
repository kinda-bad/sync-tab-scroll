import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createCatalogue } from '@sync-tab-scroll/pipeline';
import type { AccountStore } from './accounts/store.js';
import { resolveUserIdFromCookie } from './auth/session.js';
import { signValue, verifySignedValue } from './auth/cookies.js';
import { rescanAndBroadcastCatalog } from './authoring-rescan.js';
import type { HandlerContext } from './handlers/context.js';
import { validateField } from './input-validation.js';

// T008/T010: Phase 2 authoring field caps (implementation-time judgment,
// following input-validation.ts's 64/256-char precedent — plan's Open
// Questions). slug/name/artist/title/submitterName are short display-ish
// fields; the activation key reuses the same 256-char cap as the WS
// catalogue-unlock key.
const SLUG_MAX_LENGTH = 64;
const NAME_MAX_LENGTH = 128;
const KEY_MAX_LENGTH = 256;

const CREATE_ROUTE = '/catalogues';
const INVITE_GENERATE_ROUTE = /^\/catalogues\/([^/]+)\/invite$/;
const INVITE_REDEEM_ROUTE = '/invites/redeem';
const OWNERS_ROUTE = /^\/catalogues\/([^/]+)\/owners$/;

/** Invite links expire after 7 days (owner decision at implementation time — datamodel.md T016, "decide at implementation time, not a design commitment"). */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CatalogueAuthoringRouteOptions {
  store: AccountStore;
  /** The LIVE catalog root — same directory `catalog-static.ts`/`catalog-loader.ts` already serve/scan. */
  catalogRoot: string;
  /** Present in production; omitted only by narrowly-scoped tests that never reach the rescan/broadcast step. */
  ctx?: HandlerContext;
  requireSongConsent?: boolean;
  /** Signs/verifies invite tokens — the same secret `sts_auth_tx` already uses (auth/cookies.ts), no new secret to provision. */
  sessionCookieSecret: string;
}

interface InviteTokenPayload {
  catalogueId: string;
  exp: number;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.setHeader('content-type', 'application/json');
  res.writeHead(status).end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

/**
 * Mounts the in-app authoring routes that aren't the upload trust surface
 * (song-upload-route.ts already owns `POST /catalogues/:id/songs`):
 * `POST /catalogues` (T012 — create catalogue), `POST /catalogues/:id/invite`
 * (T016 — owner-only invite-link generation), `POST /invites/redeem`
 * (T017 — redeeming grants CatalogueOwnership + CatalogueMembership(via:
 * 'invite') in one action, ui.md — no separate "accept" step), and
 * `GET /catalogues/:id/owners` (T018 — the co-owners roster, owner-only).
 */
export function createCatalogueAuthoringRequestHandler(opts: CatalogueAuthoringRouteOptions): (req: IncomingMessage, res: ServerResponse) => boolean {
  const { store, catalogRoot, ctx, requireSongConsent = false, sessionCookieSecret } = opts;

  async function handleCreateCatalogue(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const userId = await resolveUserIdFromCookie(store, req.headers.cookie);
    if (!userId) {
      json(res, 401, { error: 'sign in required' });
      return;
    }

    let body: { slug?: unknown; name?: unknown; visibility?: unknown; key?: unknown };
    try {
      body = (await readJsonBody(req)) as typeof body;
    } catch {
      json(res, 400, { error: 'malformed JSON body' });
      return;
    }

    const { slug, name, visibility, key } = body;
    if (typeof slug !== 'string' || !slug || typeof name !== 'string' || !name || (visibility !== 'public' && visibility !== 'private')) {
      json(res, 400, { error: 'slug, name, and visibility (public|private) are required' });
      return;
    }

    // T008: reject (not sanitize) control/HTML-char/over-length input in
    // slug/name, same contract as the WS handlers (infrastructure.md Input
    // Validation) — alongside the presence/type checks above.
    const slugResult = validateField(slug, SLUG_MAX_LENGTH);
    if (!slugResult.ok) {
      json(res, 400, { error: 'slug is invalid' });
      return;
    }
    const nameResult = validateField(name, NAME_MAX_LENGTH);
    if (!nameResult.ok) {
      json(res, 400, { error: 'name is invalid' });
      return;
    }

    if (visibility === 'private' && (typeof key !== 'string' || !key)) {
      json(res, 400, { error: 'a private catalogue requires a key' });
      return;
    }
    if (visibility === 'private' && typeof key === 'string' && !validateField(key, KEY_MAX_LENGTH).ok) {
      json(res, 400, { error: 'key is invalid' });
      return;
    }

    if (fs.existsSync(path.join(catalogRoot, slug))) {
      json(res, 409, { error: `catalogue "${slug}" already exists` });
      return;
    }

    try {
      createCatalogue(catalogRoot, slug, name, visibility, typeof key === 'string' ? key : undefined);
    } catch (err) {
      json(res, 400, { error: err instanceof Error ? err.message : 'failed to create catalogue' });
      return;
    }

    const ownership = await store.createOwnership({ catalogueId: slug, ownerId: userId });
    if (!ownership) {
      // Store unavailable mid-write (§13 S7) — the directory was created but
      // ownership couldn't be recorded. Report it plainly rather than
      // pretending success; the operator CLI (set-catalogue-owner) can backfill.
      json(res, 500, { error: 'catalogue directory created but ownership could not be recorded (account store unavailable)' });
      return;
    }
    await store.upsertMembership({ userId, catalogueId: slug, grantedVia: 'owner', keyEpoch: null });

    if (ctx) rescanAndBroadcastCatalog(ctx, catalogRoot, requireSongConsent);

    json(res, 200, { ok: true, catalogueId: slug });
  }

  async function handleGenerateInvite(catalogueId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const userId = await resolveUserIdFromCookie(store, req.headers.cookie);
    if (!userId) {
      json(res, 401, { error: 'sign in required' });
      return;
    }
    const isOwner = await store.isOwner(catalogueId, userId);
    if (!isOwner) {
      json(res, 403, { error: 'not an owner of this catalogue' });
      return;
    }

    const payload: InviteTokenPayload = { catalogueId, exp: Date.now() + INVITE_TTL_MS };
    const token = signValue(JSON.stringify(payload), sessionCookieSecret);
    json(res, 200, { token });
  }

  async function handleRedeemInvite(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const userId = await resolveUserIdFromCookie(store, req.headers.cookie);
    if (!userId) {
      json(res, 401, { error: 'sign in required' });
      return;
    }

    let body: { token?: unknown };
    try {
      body = (await readJsonBody(req)) as typeof body;
    } catch {
      json(res, 400, { error: 'malformed JSON body' });
      return;
    }
    if (typeof body.token !== 'string' || !body.token) {
      json(res, 400, { error: 'token is required' });
      return;
    }

    const raw = verifySignedValue(body.token, sessionCookieSecret);
    if (!raw) {
      json(res, 400, { error: 'invalid or tampered invite token' });
      return;
    }
    let payload: InviteTokenPayload;
    try {
      payload = JSON.parse(raw) as InviteTokenPayload;
    } catch {
      json(res, 400, { error: 'malformed invite token' });
      return;
    }
    if (typeof payload.catalogueId !== 'string' || typeof payload.exp !== 'number') {
      json(res, 400, { error: 'malformed invite token' });
      return;
    }
    if (payload.exp <= Date.now()) {
      json(res, 400, { error: 'invite link has expired' });
      return;
    }

    // No separate "accept" step (ui.md) — redeeming grants both rows in one action.
    const ownership = await store.createOwnership({ catalogueId: payload.catalogueId, ownerId: userId });
    if (!ownership) {
      json(res, 500, { error: 'account store unavailable' });
      return;
    }
    await store.upsertMembership({ userId, catalogueId: payload.catalogueId, grantedVia: 'invite', keyEpoch: null });

    json(res, 200, { ok: true, catalogueId: payload.catalogueId });
  }

  async function handleListOwners(catalogueId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const userId = await resolveUserIdFromCookie(store, req.headers.cookie);
    if (!userId) {
      json(res, 401, { error: 'sign in required' });
      return;
    }
    const isOwner = await store.isOwner(catalogueId, userId);
    if (!isOwner) {
      json(res, 403, { error: 'not an owner of this catalogue' });
      return;
    }

    // T018's roster: every co-owner's id + display name, resolved from the
    // account store (getOwnershipsByCatalogue only returns bare rows).
    const ownerships = await store.getOwnershipsByCatalogue(catalogueId);
    const owners = await Promise.all(
      ownerships.map(async (o) => {
        const user = await store.getUser(o.ownerId);
        return { userId: o.ownerId, displayName: user?.displayName ?? o.ownerId };
      }),
    );
    json(res, 200, { owners });
  }

  function fail(res: ServerResponse, err: unknown): void {
    console.error('[catalogue-authoring] route error:', err instanceof Error ? err.message : err);
    if (!res.headersSent) res.writeHead(500).end();
  }

  return (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;

    if (req.method === 'POST' && pathname === CREATE_ROUTE) {
      handleCreateCatalogue(req, res).catch((err) => fail(res, err));
      return true;
    }
    if (req.method === 'POST' && pathname === INVITE_REDEEM_ROUTE) {
      handleRedeemInvite(req, res).catch((err) => fail(res, err));
      return true;
    }
    if (req.method === 'POST') {
      const m = pathname.match(INVITE_GENERATE_ROUTE);
      if (m) {
        handleGenerateInvite(decodeURIComponent(m[1]), req, res).catch((err) => fail(res, err));
        return true;
      }
    }
    if (req.method === 'GET') {
      const m = pathname.match(OWNERS_ROUTE);
      if (m) {
        handleListOwners(decodeURIComponent(m[1]), req, res).catch((err) => fail(res, err));
        return true;
      }
    }
    return false;
  };
}
