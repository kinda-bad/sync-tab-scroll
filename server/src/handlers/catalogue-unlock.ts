import * as crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './context.js';
import { visibleCatalog } from '../catalog-loader.js';
import { validateActivationKey } from '../input-validation.js';

/**
 * True when `key` hashes (with `salt`) to `storedHashHex`. Uses
 * `crypto.timingSafeEqual` (never a plain `===`, to avoid a timing
 * side-channel — datamodel.md Catalogue Activation Key). A length mismatch (a
 * corrupt stored hash) can't be a correct key, so it's a failure rather than
 * letting `timingSafeEqual` throw.
 */
function verifyKey(key: string, salt: string, storedHashHex: string): boolean {
  const storedHash = Buffer.from(storedHashHex, 'hex');
  const computed = crypto.scryptSync(key, salt, storedHash.length);
  return storedHash.length === computed.length && crypto.timingSafeEqual(storedHash, computed);
}

/**
 * Handles a host's `catalogue-unlock { key }` (infrastructure.md Catalogue
 * Activation Key Unlock). Host-only, same authorization pattern as song
 * selection. The message carries **no catalogueId** — a locked catalogue's
 * id/name is never sent to the client — so the server resolves *which*
 * catalogue the key belongs to by trying it against every locked,
 * not-yet-unlocked catalogue and unlocking the first whose stored hash matches.
 * Public and already-unlocked catalogues are never in that set, so nothing
 * leaks which catalogue ids exist. On success the matched catalogue id is
 * appended to `Session.unlockedCatalogueIds` and two messages are broadcast:
 * the normal `session-state` and a fresh, now-wider `catalog` (via
 * `visibleCatalog`). A key matching nothing is the same terse `error` as a
 * wrong key — the client can't tell "wrong key" from "no such catalogue".
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

  const keyResult = validateActivationKey(message.key);
  if (!keyResult.ok) {
    ctx.connections.send(socket, { type: 'error', message: 'Activation key is invalid' });
    return;
  }
  const key = keyResult.value;

  // Try the key against every locked, not-yet-unlocked catalogue and take the
  // first match. Public catalogues (no salt/hash) and already-unlocked ones are
  // excluded from the set, so there's no per-id early-return that could leak
  // which catalogues exist.
  const unlocked = new Set(session.unlockedCatalogueIds);
  const catalogue = ctx.catalog.catalogues.find(
    (c) => !c.public && !!c.salt && !!c.hash && !unlocked.has(c.id) && verifyKey(key, c.salt, c.hash),
  );
  if (!catalogue) {
    ctx.connections.send(socket, { type: 'error', message: 'Incorrect activation key' });
    return;
  }

  session.unlockedCatalogueIds.push(catalogue.id);
  // Record this as the key-typed slice (a sticky session fact that survives host
  // change, §13 S4) — distinct from the membership-derived slice re-derived on
  // host change (membership-unlock.ts).
  ctx.sessionStore.recordKeyUnlock(session.code, catalogue.id);
  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
  ctx.connections.broadcast(session.code, () => ({ type: 'catalog', ...visibleCatalog(ctx.catalog, session) }));

  // Persist the unlock for a logged-in host (infrastructure.md "Persisting the
  // unlock"). The connection already carries the resolved userId from the WS
  // upgrade (T011) — read it from the registry, never re-resolve the cookie. An
  // anonymous host (userId null) persists nothing, exactly as before accounts.
  // The write is BEST-EFFORT (§13 S7): the live-session unlock above already
  // succeeded and broadcast; if the store is unavailable/errors the membership
  // just isn't remembered for next time — never a crash. It records the
  // catalogue's CURRENT epoch (§13 S5) keyed on the stable catalogue id (§13 S8).
  if (conn.userId) {
    const keyEpoch = catalogue.epoch ?? 1;
    void ctx.accountStore
      .upsertMembership({ userId: conn.userId, catalogueId: catalogue.id, grantedVia: 'key', keyEpoch })
      .catch((err) => console.error('[catalogue-unlock] best-effort membership write failed:', err instanceof Error ? err.message : err));
  }
}
