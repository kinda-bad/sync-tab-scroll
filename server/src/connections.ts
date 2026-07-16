import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';

export interface ConnectionInfo {
  sessionCode: string;
  participantId: string;
  /**
   * The authenticated account `userId` (or null for an anonymous connection),
   * resolved from the auth cookie at WS upgrade and stamped here at attach time
   * (§13; infrastructure.md WS upgrade). This is connection-level identity only
   * — it is NOT a `Participant` reclaim key (an auth cookie alone never reclaims
   * a seat; reclaim stays keyed on `participantId`). Its Phase-1 job is seeding
   * host-only catalogue auto-unlock from the host's `CatalogueMembership` set.
   */
  userId: string | null;
}

/** Info passed to {@link ConnectionRegistry.attach} — `userId` is supplied out-of-band via {@link ConnectionRegistry.stampUserId}. */
export type AttachInfo = Omit<ConnectionInfo, 'userId'>;

/** Tracks which session/participant each live WebSocket connection belongs to. */
export class ConnectionRegistry {
  private info = new Map<WebSocket, ConnectionInfo>();
  private sockets = new Map<string, Set<WebSocket>>();
  /** userId resolved at upgrade, awaiting the attach that a session-create/join triggers. */
  private pendingUserId = new Map<WebSocket, string | null>();

  /**
   * Records the authenticated userId (or null) for a socket at WS-upgrade time,
   * ahead of the `session-create`/`session-join` handler that attaches the
   * participant. `attach` reads and clears it.
   */
  stampUserId(socket: WebSocket, userId: string | null): void {
    this.pendingUserId.set(socket, userId);
  }

  /**
   * Reads the stamped-at-upgrade userId WITHOUT consuming it (unlike `attach`)
   * — for a handler that needs to know the joining/creating socket's userId
   * before constructing the `Participant` row it will pass to `attach`
   * (Phase 2 in-app authoring; `Participant.userId` wire field, T007). Returns
   * `null` if nothing was stamped (anonymous, or already attached/detached).
   */
  peekPendingUserId(socket: WebSocket): string | null {
    return this.pendingUserId.get(socket) ?? null;
  }

  attach(socket: WebSocket, info: AttachInfo): void {
    const userId = this.pendingUserId.get(socket) ?? null;
    this.pendingUserId.delete(socket);
    this.info.set(socket, { ...info, userId });
    if (!this.sockets.has(info.sessionCode)) this.sockets.set(info.sessionCode, new Set());
    this.sockets.get(info.sessionCode)!.add(socket);
  }

  get(socket: WebSocket): ConnectionInfo | undefined {
    return this.info.get(socket);
  }

  /**
   * Looks up a session's connection by participant id — used to read the new
   * host's resolved `userId` when re-deriving membership unlocks on host change
   * (T015). Returns undefined if that participant has no live connection (e.g.
   * a promoted-but-not-yet-reconnected host).
   */
  getByParticipant(sessionCode: string, participantId: string): ConnectionInfo | undefined {
    for (const socket of this.sockets.get(sessionCode) ?? []) {
      const conn = this.info.get(socket);
      if (conn?.participantId === participantId) return conn;
    }
    return undefined;
  }

  detach(socket: WebSocket): ConnectionInfo | undefined {
    const conn = this.info.get(socket);
    if (conn) this.sockets.get(conn.sessionCode)?.delete(socket);
    this.info.delete(socket);
    this.pendingUserId.delete(socket);
    return conn;
  }

  send(socket: WebSocket, message: ServerMessage & { selfParticipantId?: string }): void {
    socket.send(JSON.stringify(message));
  }

  broadcast(sessionCode: string, buildMessage: (participantId: string) => ServerMessage): void {
    for (const socket of this.sockets.get(sessionCode) ?? []) {
      const conn = this.info.get(socket);
      if (!conn) continue;
      socket.send(JSON.stringify(buildMessage(conn.participantId)));
    }
  }
}
