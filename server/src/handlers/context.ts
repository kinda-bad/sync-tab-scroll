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
   */
  accountStore: AccountStore;
}
