import type { Session } from '@sync-tab-scroll/shared';

const GRACE_PERIOD_MS = 30_000;

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Sessions are server-memory-only: a grace-period timer destroys empty
 * sessions, and a server restart drops active ones. No durable backing
 * store for session state (infrastructure.md Production Posture — a known
 * production characteristic, not a shortcut to silently fix later).
 */
export class SessionStore {
  private sessions = new Map<string, Session>();
  private graceTimers = new Map<string, NodeJS.Timeout>();

  create(hostId: string): Session {
    let code = generateJoinCode();
    while (this.sessions.has(code)) code = generateJoinCode();

    const session: Session = {
      code,
      selectedSong: null,
      availableParts: [],
      participants: [],
      hostId,
      playbackState: { status: 'stopped', tickPosition: 0, bpm: 120, serverTimestamp: Date.now() },
      countInEnabled: false,
      metronomeEnabled: false,
      lobbyCursorTick: null,
    };
    this.sessions.set(code, session);
    return session;
  }

  get(code: string): Session | undefined {
    return this.sessions.get(code);
  }

  all(): Session[] {
    return [...this.sessions.values()];
  }

  /** Cancels any pending grace-period destruction — a participant is present again. */
  markActive(code: string): void {
    const timer = this.graceTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(code);
    }
  }

  /** Starts the grace-period timer if the session has no connected participants. */
  markPossiblyEmpty(code: string): void {
    const session = this.sessions.get(code);
    if (!session) return;
    const hasConnected = session.participants.some((p) => p.connectionStatus === 'connected');
    if (hasConnected || this.graceTimers.has(code)) return;

    const timer = setTimeout(() => {
      this.sessions.delete(code);
      this.graceTimers.delete(code);
    }, GRACE_PERIOD_MS);
    this.graceTimers.set(code, timer);
  }
}
