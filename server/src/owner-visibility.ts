import type { WebSocket } from 'ws';
import type { Session } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './handlers/context.js';
import { visibleCatalog } from './catalog-loader.js';

/**
 * The owned-catalogue-ids slice `visibleCatalog`'s third parameter needs
 * (infrastructure.md "Per-user visibility"; datamodel.md CatalogueOwnership).
 * `visibleCatalog` stays a pure sync filter — this is the async pre-resolve
 * step, using the `CatalogueOwnership.ownerId` index, same shape
 * `membershipDerivedUnlocks`'s pre-resolve already uses for
 * `unlockedCatalogueIds`. `null`/anonymous never touches the store (fail-soft
 * default: owns nothing).
 */
export async function resolveOwnedCatalogueIds(ctx: HandlerContext, userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const ownerships = await ctx.accountStore.getOwnershipsByOwner(userId);
  return ownerships.map((o) => o.catalogueId);
}

/**
 * Sends this one socket an updated `catalog` message if — and only if — the
 * joining/creating participant's own `CatalogueOwnership` grants visibility
 * into a catalogue the initial (ownership-unaware) `catalog` send didn't
 * already include (infrastructure.md "Per-user visibility": "an owner must see
 * their own not-yet-published catalogue when *they* join a session, even
 * before anyone unlocks it"). Deliberately per-recipient — `ctx.connections.send`,
 * never `broadcast` — since ownership visibility is recipient-specific, unlike
 * the shared `unlockedCatalogueIds` gate every other `catalog` re-broadcast in
 * this codebase filters on. Best-effort/async, mirroring
 * `seedHostMembershipUnlocks`'s fire-and-forget follow-up-send shape (§13 S7):
 * called after the handler's synchronous session-state/catalog messages
 * already went out, so a null/failing store just means no extra visibility.
 */
export async function sendOwnerVisibleCatalog(
  ctx: HandlerContext,
  socket: WebSocket,
  session: Pick<Session, 'unlockedCatalogueIds'>,
  userId: string | null,
): Promise<void> {
  const ownedCatalogueIds = await resolveOwnedCatalogueIds(ctx, userId);
  if (ownedCatalogueIds.length === 0) return;

  const withoutOwnership = visibleCatalog(ctx.catalog, session);
  const withOwnership = visibleCatalog(ctx.catalog, session, ownedCatalogueIds);
  if (withOwnership.catalogues.length === withoutOwnership.catalogues.length) return; // ownership added nothing new

  ctx.connections.send(socket, { type: 'catalog', ...withOwnership });
}
