import type { CatalogSong } from '@sync-tab-scroll/shared';
import type { SessionStore } from '../session-store.js';
import type { ConnectionRegistry } from '../connections.js';

export interface HandlerContext {
  sessionStore: SessionStore;
  connections: ConnectionRegistry;
  catalog: CatalogSong[];
}
