/**
 * Compile-time type assertions pinning the wire `ServerMessage` variants
 * (datamodel.md) — constitution Principle VI. Type-checked by `pnpm check`
 * (tsc --noEmit); emits no runtime behavior. Guards the typed
 * `session-not-found` signal (F001): a named message the client treats as
 * unconditionally terminal, replacing the stringly-typed `error` heuristic.
 */
import type { ServerMessage } from './messages.js';

// --- exact-shape equality helper -------------------------------------------
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// `session-not-found` is a member of the ServerMessage union, and its shape is
// exactly `{ type: 'session-not-found'; code: string }` — `code` is required
// (an `Equal` against a `code`-less shape, or an optional `code?`, would fail).
type _SessionNotFound = Expect<
  Equal<Extract<ServerMessage, { type: 'session-not-found' }>, { type: 'session-not-found'; code: string }>
>;

// Value-level pin: a well-formed variant is assignable to ServerMessage.
const _sessionNotFound: ServerMessage = { type: 'session-not-found', code: 'ABCD' };
void _sessionNotFound;
