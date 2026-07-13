import type { WebSocket } from 'ws';
import type { CatalogueMembership } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './handlers/context.js';
import type { LoadedCatalogue } from './catalog-loader.js';
import { visibleCatalog } from './catalog-loader.js';

/**
 * Whether a membership still grants access to a loaded catalogue. A
 * `grantedVia:'key'` membership is epoch-gated (§13 S5): it only counts while
 * its `keyEpoch` equals the catalogue's current `epoch`, so a key rotation
 * strands old key-grants. `owner`/`invite` grants are not key-derived and are
 * never epoch-gated.
 */
export function isMembershipCurrent(m: CatalogueMembership, catalogue: LoadedCatalogue): boolean {
  if (m.grantedVia === 'key') return m.keyEpoch === (catalogue.epoch ?? 1);
  return true;
}

/**
 * The membership-derived unlock slice (datamodel.md `unlockedCatalogueIds`): the
 * catalogue ids a user's memberships currently grant. A membership to a
 * catalogue that isn't loaded is inert and skipped (no cross-store FK, §13 S8);
 * a stale-epoch key membership is skipped (§13 S5). Pure — the seeding/re-derive
 * wiring is separate.
 */
export function membershipDerivedUnlocks(memberships: CatalogueMembership[], catalogues: LoadedCatalogue[]): string[] {
  const byId = new Map(catalogues.map((c) => [c.id, c]));
  const out: string[] = [];
  for (const m of memberships) {
    const catalogue = byId.get(m.catalogueId);
    if (catalogue && isMembershipCurrent(m, catalogue) && !out.includes(m.catalogueId)) {
      out.push(m.catalogueId);
    }
  }
  return out;
}

/**
 * Host-only membership auto-unlock at `session-create`/`session-join` (design
 * §12.1; T014). Unions the **host's** epoch-current memberships into
 * `Session.unlockedCatalogueIds`, then emits the same `session-state` + `catalog`
 * re-broadcast pair `catalogue-unlock` already uses — but only when the socket
 * belongs to the session host (a non-host authenticated joiner never unlocks)
 * and the set actually grew. Best-effort and fail-soft: the account store
 * degrades to an empty membership list on error (§13 S7), so this quietly
 * does nothing rather than throwing.
 */
export async function seedHostMembershipUnlocks(ctx: HandlerContext, code: string, socket: WebSocket): Promise<void> {
  const conn = ctx.connections.get(socket);
  if (!conn?.userId) return; // anonymous
  const session = ctx.sessionStore.get(code);
  if (!session) return;
  if (session.hostId !== conn.participantId) return; // host-only

  const memberships = await ctx.accountStore.getMembershipsByUser(conn.userId);
  const derived = membershipDerivedUnlocks(memberships, ctx.catalog.catalogues);

  let grew = false;
  for (const id of derived) {
    if (!session.unlockedCatalogueIds.includes(id)) {
      session.unlockedCatalogueIds.push(id);
      grew = true;
    }
  }
  if (!grew) return;

  ctx.connections.broadcast(session.code, (selfParticipantId) => ({ type: 'session-state', session, selfParticipantId }));
  ctx.connections.broadcast(session.code, () => ({ type: 'catalog', ...visibleCatalog(ctx.catalog, session) }));
}
