import type { SessionStore } from '../session-store.js';
import type { ConnectionRegistry } from '../connections.js';
import type { LoadedCatalog } from '../catalog-loader.js';

export interface HandlerContext {
  sessionStore: SessionStore;
  connections: ConnectionRegistry;
  /** Server-global catalogue set (`{ catalogues, songs }`), loaded once at startup by `loadCatalog`. Per-session visibility filtering happens at send time via `visibleCatalog`. */
  catalog: LoadedCatalog;
}
