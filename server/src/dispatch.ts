import type { WebSocket } from 'ws';
import type { ClientMessage } from '@sync-tab-scroll/shared';
import type { HandlerContext } from './handlers/context.js';
import { handleSessionCreate } from './handlers/session-create.js';
import { handleSessionJoin } from './handlers/session-join.js';
import { handlePartSelect } from './handlers/part-select.js';
import { handleReadinessUpdate } from './handlers/readiness-update.js';
import { handleHostRemoveParticipant } from './handlers/host-remove-participant.js';
import { handlePlaybackControl } from './handlers/playback-control.js';
import { handleLobbyCursorSet } from './handlers/lobby-cursor-set.js';

/**
 * Routes each incoming message to its own named handler (Principle IV) —
 * this switch only dispatches, it doesn't contain business logic itself.
 */
export function dispatch(ctx: HandlerContext, socket: WebSocket, message: ClientMessage): void {
  switch (message.type) {
    case 'session-create':
      return handleSessionCreate(ctx, socket, message);
    case 'session-join':
      return handleSessionJoin(ctx, socket, message);
    case 'part-select':
      return handlePartSelect(ctx, socket, message);
    case 'readiness-update':
      return handleReadinessUpdate(ctx, socket, message);
    case 'host-remove-participant':
      return handleHostRemoveParticipant(ctx, socket, message);
    case 'playback-control':
      return handlePlaybackControl(ctx, socket, message);
    case 'lobby-cursor-set':
      return handleLobbyCursorSet(ctx, socket, message);
  }
}
