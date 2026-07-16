import type { HandlerContext } from './handlers/context.js';
import { rescanCatalog, visibleCatalog } from './catalog-loader.js';

/**
 * Called after a successful in-app authoring write (Phase 3's upload route;
 * infrastructure.md "Mutation model"): re-scans `catalogRoot` and re-broadcasts
 * a fresh `catalog` message to every live session whose visible set actually
 * changed — reusing the exact `{ type: 'catalog', ...visibleCatalog(...) }`
 * broadcast shape `catalogue-unlock`/membership-unlock already use when a
 * session's unlocked set grows. A session snapshot is taken BEFORE the rescan
 * (session-scoped, not owner-aware — the per-user ownership slice is a
 * per-recipient concern handled separately, owner-visibility.ts) so the
 * before/after comparison is meaningful.
 */
export function rescanAndBroadcastCatalog(ctx: HandlerContext, catalogRoot: string, requireSongConsent = false): void {
  const before = new Map(ctx.sessionStore.all().map((session) => [session.code, visibleCatalog(ctx.catalog, session)]));

  rescanCatalog(ctx, catalogRoot, requireSongConsent);

  for (const session of ctx.sessionStore.all()) {
    const previous = before.get(session.code);
    const next = visibleCatalog(ctx.catalog, session);
    const unchanged =
      previous &&
      sameIds(
        previous.catalogues.map((c) => c.id),
        next.catalogues.map((c) => c.id),
      ) &&
      sameIds(
        previous.songs.map((s) => s.id),
        next.songs.map((s) => s.id),
      );
    if (unchanged) continue;
    ctx.connections.broadcast(session.code, () => ({ type: 'catalog', ...next }));
  }
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}
