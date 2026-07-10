import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { visibleCatalog } from '../catalog-loader.js';

/**
 * Handles a host's `catalogue-unlock { catalogueId, key }` (infrastructure.md
 * Catalogue Activation Key Unlock). Host-only, same authorization pattern as
 * song selection. The submitted key is hashed with the catalogue's stored
 * salt and compared to the stored hash with `crypto.timingSafeEqual` (never
 * a plain `===`, to avoid a timing side-channel — datamodel.md Catalogue
 * Activation Key). On success the catalogue id is appended to
 * `Session.unlockedCatalogueIds` and two messages are broadcast: the normal
 * `session-state` and a fresh, now-wider `catalog` (via `visibleCatalog`).
 *
 * PRODUCTION ANNOTATION: no rate limiting or lockout on repeated wrong-key
 * attempts here — the constitution's Production Posture already scopes rate
 * limiting out (infrastructure.md Catalogue Activation Key Unlock). A public
 * deployment gating genuinely valuable content should revisit this.
 */
export function handleCatalogueUnlock(ctx: HandlerContext, socket: WebSocket, message: Extract<ClientMessage, { type: 'catalogue-unlock' }>): void {
  const conn = ctx.connections.get(socket);
  if (!conn) return;
  const session = ctx.sessionStore.get(conn.sessionCode);
  if (!session) return;

  if (session.hostId !== conn.participantId) {
    ctx.connections.send(socket, { type: 'error', message: 'Only the host can unlock a catalogue' });
    return;
  }

  const catalogue = ctx.catalog.catalogues.find((c) => c.id === message.catalogueId);
  if (!catalogue) {
    ctx.connections.send(socket, { type: 'error', message: `Catalogue ${message.catalogueId} not found` });
    return;
  }

  // A public catalogue has no key record (no salt/hash) — there's nothing to
  // unlock; its songs are always visible already.
  if (catalogue.public || !catalogue.salt || !catalogue.hash) {
    ctx.connections.send(socket, { type: 'error', message: `Catalogue ${message.catalogueId} is not locked` });
    return;
  }

  if (session.unlockedCatalogueIds.includes(catalogue.id)) {
    ctx.connections.send(socket, { type: 'error', message: `Catalogue ${message.catalogueId} is already unlocked` });
    return;
  }

  const storedHash = Buffer.from(catalogue.hash, 'hex');
  const computed = crypto.scryptSync(message.key, catalogue.salt, storedHash.length);
  // timingSafeEqual requires equal-length buffers; a length mismatch (a
  // corrupt stored hash) can't be a correct key, so treat it as a failure
  // rather than letting timingSafeEqual throw.
  const ok = storedHash.length === computed.length && crypto.timingSafeEqual(storedHash, computed);
  if (!ok) {
    ctx.connections.send(socket, { type: 'error', message: 'Incorrect activation key' });
    return;
  }

  session.unlockedCatalogueIds.push(catalogue.id);
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
  ctx.connections.broadcast(session.code, () => ({ type: 'catalog', ...visibleCatalog(ctx.catalog, session) }));
}
