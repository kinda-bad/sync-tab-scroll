/**
 * Trailing-edge debounce: coalesces a rapid burst of calls into a single
 * invocation (the last call's arguments) once `ms` elapses with no further
 * calls. Used to coalesce rapid cursor-set broadcasts at the send boundary
 * (plan-lobby-cursor-race-2026-07-04.md) rather than adding staleness
 * detection to every receiving client.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  }) as T;
}
