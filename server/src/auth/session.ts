import type { AuthSession, User } from '@sync-tab-scroll/shared';
import type { AccountStore } from '../accounts/store.js';

/** Default AuthSession lifetime — 30 days (a code constant, not env config). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface ResolvedAuth {
  session: AuthSession;
  user: User;
}

/**
 * The single cookie → `AuthSession` → `User` resolution seam (infrastructure.md
 * Production Posture — "who is this participant" resolved in one place). Reused
 * by `/me` (T008) and the WebSocket upgrade (T011). Returns null (anonymous) if
 * there is no session id, the session is unknown, expired, or `revokedAt` is
 * set, or the store is unavailable/errors (§13 S7 — the store already fails soft
 * to null/empty, so a mid-run DB failure surfaces here as "anonymous", never a
 * throw).
 */
export async function resolveAuth(store: AccountStore, sessionId: string | undefined): Promise<ResolvedAuth | null> {
  if (!sessionId) return null;
  const session = await store.getAuthSession(sessionId);
  if (!session) return null;
  if (session.revokedAt != null) return null;
  if (session.expiresAt <= Date.now()) return null;
  const user = await store.getUser(session.userId);
  if (!user) return null;
  return { session, user };
}
