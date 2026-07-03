import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { ConnectionRegistry } from './connections.js';

function fakeSocket() {
  return { send: vi.fn() } as unknown as WebSocket & { send: ReturnType<typeof vi.fn> };
}

describe('ConnectionRegistry', () => {
  it('attach + get round-trips connection info', () => {
    const registry = new ConnectionRegistry();
    const socket = fakeSocket();
    registry.attach(socket, { sessionCode: 'ABCD', participantId: 'p1' });

    expect(registry.get(socket)).toEqual({ sessionCode: 'ABCD', participantId: 'p1' });
  });

  it('detach removes the connection and returns the removed info', () => {
    const registry = new ConnectionRegistry();
    const socket = fakeSocket();
    registry.attach(socket, { sessionCode: 'ABCD', participantId: 'p1' });

    expect(registry.detach(socket)).toEqual({ sessionCode: 'ABCD', participantId: 'p1' });
    expect(registry.get(socket)).toBeUndefined();
  });

  it('detach on a never-attached socket returns undefined', () => {
    const registry = new ConnectionRegistry();
    expect(registry.detach(fakeSocket())).toBeUndefined();
  });

  it('send calls the socket send with the JSON-stringified message', () => {
    const registry = new ConnectionRegistry();
    const socket = fakeSocket();

    registry.send(socket, { type: 'error', message: 'boom' });

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'error', message: 'boom' }));
  });

  it('broadcast sends to every socket in a session code, and none from a different one', () => {
    const registry = new ConnectionRegistry();
    const socketA = fakeSocket();
    const socketB = fakeSocket();
    const socketOther = fakeSocket();
    registry.attach(socketA, { sessionCode: 'ABCD', participantId: 'a' });
    registry.attach(socketB, { sessionCode: 'ABCD', participantId: 'b' });
    registry.attach(socketOther, { sessionCode: 'WXYZ', participantId: 'c' });

    const seenParticipantIds: string[] = [];
    registry.broadcast('ABCD', (participantId) => {
      seenParticipantIds.push(participantId);
      return { type: 'error', message: participantId };
    });

    expect(seenParticipantIds.sort()).toEqual(['a', 'b']);
    expect(socketA.send).toHaveBeenCalledWith(JSON.stringify({ type: 'error', message: 'a' }));
    expect(socketB.send).toHaveBeenCalledWith(JSON.stringify({ type: 'error', message: 'b' }));
    expect(socketOther.send).not.toHaveBeenCalled();
  });
});
