import type { SessionStore } from '../session-store.js';
import type { ConnectionRegistry } from '../connections.js';
import type { LoadedCatalog } from '../catalog-loader.js';
import type { AccountStore } from '../accounts/store.js';

export interface HandlerContext {
  sessionStore: SessionStore;
  connections: ConnectionRegistry;
  /** Server-global catalogue set (`{ catalogues, songs }`), loaded once at startup by `loadCatalog`. Per-session visibility filtering happens at send time via `visibleCatalog`. */
  catalog: LoadedCatalog;
  /**
   * Durable account store (datamodel.md Account Layer). The {@link NullAccountStore}
   * when no `DATABASE_URL` is configured, so handlers that touch it degrade to
   * anonymous/no-op with the account layer disabled (design §2). Handlers read
   * the connection's already-resolved `userId` from the registry rather than
   * re-resolving the cookie.
   *
   * `accountStore.isOwner(catalogueId, userId)` (Phase 2 in-app authoring) IS
   * the `HandlerContext`-level "does this userId own this catalogueId" lookup —
   * backs both the Phase 4 authoring-action authorization check and the Phase 2
   * per-user `visibleCatalog` visibility check. No separate wrapper: the
   * `CatalogueOwnership` index on `ownerId`/`catalogueId` (datamodel.md Indexes)
   * makes it cheap enough to call directly at each site.
   */
  accountStore: AccountStore;
}
