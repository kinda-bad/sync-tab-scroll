import * as http from 'node:http';
import { WebSocketServer } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { ServerConfig } from './config.js';
import { SessionStore } from './session-store.js';
import { ConnectionRegistry } from './connections.js';
import { loadCatalog } from './catalog-loader.js';
import { createCatalogRequestHandler } from './catalog-static.js';
import { createClientStaticRequestHandler } from './client-static.js';
import { dispatch } from './dispatch.js';
import { handleDisconnect } from './disconnect.js';
import type { HandlerContext } from './handlers/context.js';
import { createAccountStore } from './accounts/factory.js';
import { createProviderRegistry } from './auth/providers.js';
import { createAuthRequestHandler } from './auth/auth-routes.js';
import { createSongUploadRequestHandler } from './song-upload-route.js';
import { createCatalogueAuthoringRequestHandler } from './catalogue-authoring-routes.js';
import { isOriginAllowed } from './auth/origin.js';
import { resolveUserIdFromCookie } from './auth/session.js';

const BROADCAST_INTERVAL_MS = 1000;

export function createServer(config: ServerConfig): http.Server {
  // Optional account store: null/absent when no DATABASE_URL is configured, so
  // the whole account layer self-disables and the anonymous path is unchanged
  // (infrastructure.md User Accounts; design §2). Migrations run in the
  // background — a brief window before they finish fails soft to anonymous
  // (§13 S7), never crashing boot.
  const accountStore = createAccountStore(config.account.databaseUrl);
  void accountStore.init().catch((err) => console.error('[account-store] init (migrations) failed:', err instanceof Error ? err.message : err));

  const ctx: HandlerContext = {
    sessionStore: new SessionStore(config.hostReassignGraceMs, config.sessionEmptyTtlMs),
    connections: new ConnectionRegistry(),
    catalog: loadCatalog(config.catalogRoot, config.requireSongConsent),
    accountStore,
    devUnlockAllCatalogues: config.devUnlockAllCatalogues,
  };

  // WS upgrade, the catalog's static-file serving, and (in production) the
  // built client SPA share one http.Server (infrastructure.md "Song
  // Catalog Delivery" / "Deployment (Railway + Terraform)") instead of
  // running as separate listeners/services. Auth routes mount FIRST (ahead of
  // catalog/static/404 — infrastructure.md OAuth flow); when accounts are
  // disabled the auth handler makes /auth/* inert and /me anonymous. Then the
  // catalog handler, then client-static as the fallback, then 404.
  const authHandler = createAuthRequestHandler({
    store: accountStore,
    config: config.account,
    providers: createProviderRegistry(config.account),
    songUploadEnabled: config.songUploadEnabled,
  });
  // In-app authoring's upload trust surface (T008/T009/T010; infrastructure.md
  // "Upload trust surface") — mounted after auth (it resolves the session
  // cookie itself via the same seam) and before the catalog/static/404 chain.
  const songUploadHandler = createSongUploadRequestHandler({
    store: accountStore,
    catalogRoot: config.catalogRoot,
    ctx,
    requireSongConsent: config.requireSongConsent,
    songUploadEnabled: config.songUploadEnabled,
  });
  // T012/T016/T017 — create-catalogue + invite generate/redeem. Mounted
  // alongside the upload trust surface, same auth seam and position in the chain.
  const catalogueAuthoringHandler = createCatalogueAuthoringRequestHandler({
    store: accountStore,
    catalogRoot: config.catalogRoot,
    ctx,
    requireSongConsent: config.requireSongConsent,
    sessionCookieSecret: config.account.sessionCookieSecret,
  });
  const catalogHandler = createCatalogRequestHandler(config.catalogRoot);
  const clientStaticHandler = createClientStaticRequestHandler(config.clientRoot);
  const httpServer = http.createServer((req, res) => {
    if (authHandler(req, res)) return;
    if (songUploadHandler(req, res)) return;
    if (catalogueAuthoringHandler(req, res)) return;
    if (catalogHandler(req, res)) return;
    if (clientStaticHandler(req, res)) return;
    res.writeHead(404).end();
  });
  httpServer.listen(config.port);

  // `noServer` mode so the upgrade is validated by hand: the Origin allowlist
  // (§13 S3) rejects a disallowed origin BEFORE any cookie is read — cookies
  // ride the WS handshake cross-site, so SameSite is not the sole CSRF defense.
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, socket, head) => {
    if (!isOriginAllowed(req.headers.origin, config.account.publicBaseUrl)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    // After the Origin check, resolve the cookie → userId (fail-soft to null,
    // §13 S7) BEFORE completing the handshake, then stamp it so the
    // session-create/join handler's attach carries the identity (T011). This is
    // the single cookie → AuthSession → userId resolution seam.
    void resolveUserIdFromCookie(accountStore, req.headers.cookie).then((userId) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ctx.connections.stampUserId(ws, userId);
        wss.emit('connection', ws, req);
      });
    });
  });

  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(data.toString());
      } catch {
        ctx.connections.send(socket, { type: 'error', message: 'Malformed message' });
        return;
      }
      dispatch(ctx, socket, message);
    });

    socket.on('close', () => {
      const conn = ctx.connections.detach(socket);
      if (!conn) return;
      // Let remaining participants see the disconnect immediately (stale
      // connectivity info otherwise persisted until some other broadcast
      // happened to fire), clear a pending host request if it was theirs,
      // and start the host-succession grace period if they were the host
      // (infrastructure.md Host Succession/Host Transfer) — detach() above
      // already removed this socket from the registry, so the broadcast
      // only reaches those still connected.
      handleDisconnect(ctx, conn.sessionCode, conn.participantId);
    });
  });

  setInterval(() => {
    // Periodic PlaybackState broadcast for running sessions — each client
    // uses this to correct its own alphaTab instance's drift, rather than
    // being continuously driven by the server (infrastructure.md).
    for (const session of ctx.sessionStore.all()) {
      if (session.playbackState.status !== 'running') continue;
      session.playbackState.serverTimestamp = Date.now();
      ctx.connections.broadcast(session.code, (selfParticipantId) => ({
        type: 'session-state',
        session,
        selfParticipantId,
      }));
    }
  }, BROADCAST_INTERVAL_MS);

  return httpServer;
}
