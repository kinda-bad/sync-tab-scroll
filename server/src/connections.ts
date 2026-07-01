import type { WebSocket } from 'ws';
import type { ServerMessage } from '@sync-tab-scroll/shared';

export interface ConnectionInfo {
  sessionCode: string;
  participantId: string;
}

/** Tracks which session/participant each live WebSocket connection belongs to. */
export class ConnectionRegistry {
  private info = new Map<WebSocket, ConnectionInfo>();
  private sockets = new Map<string, Set<WebSocket>>();

  attach(socket: WebSocket, info: ConnectionInfo): void {
    this.info.set(socket, info);
    if (!this.sockets.has(info.sessionCode)) this.sockets.set(info.sessionCode, new Set());
    this.sockets.get(info.sessionCode)!.add(socket);
  }

  get(socket: WebSocket): ConnectionInfo | undefined {
    return this.info.get(socket);
  }

  detach(socket: WebSocket): ConnectionInfo | undefined {
    const conn = this.info.get(socket);
    if (conn) this.sockets.get(conn.sessionCode)?.delete(socket);
    this.info.delete(socket);
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
