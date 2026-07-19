import type { Session } from '@sync-tab-scroll/shared';

const DEFAULT_HOST_REASSIGN_GRACE_MS = 120_000;
/** Default idle TTL for empty sessions: 12 hours (infrastructure.md session lifecycle; SESSION_EMPTY_TTL_MS). */
const DEFAULT_SESSION_EMPTY_TTL_MS = 43_200_000;

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Sessions are server-memory-only: an idle-TTL timer (SESSION_EMPTY_TTL_MS,
 * default 12h) destroys empty sessions, and a server restart drops active
 * ones. No durable backing
 * store for session state (infrastructure.md Production Posture — a known
 * production characteristic, not a shortcut to silently fix later).
 */
export class SessionStore {
  private sessions = new Map<string, Session>();
  private graceTimers = new Map<string, NodeJS.Timeout>();
  private hostReassignTimers = new Map<string, NodeJS.Timeout>();
  /**
   * The **key-entered** slice of each session's unlocks (datamodel.md
   * `unlockedCatalogueIds`): catalogues a host unlocked by typing the activation
   * key this session. It is a session fact — sticky, tied to no user — and
   * survives host change, unlike the membership-derived slice which is
   * re-derived on host change (§13 S4). Tracked here so `rederiveHost...` can
   * recompute `unlockedCatalogueIds = key-typed ∪ new-host-memberships`.
   */
  private keyUnlocked = new Map<string, Set<string>>();

  constructor(
    private hostReassignGraceMs: number = DEFAULT_HOST_REASSIGN_GRACE_MS,
    private sessionEmptyTtlMs: number = DEFAULT_SESSION_EMPTY_TTL_MS,
  ) {}

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
      lobbyCursorTick: null,
      spotlightMode: false,
      pendingHostRequest: null,
      unlockedCatalogueIds: [],
    };
    this.sessions.set(code, session);
    this.keyUnlocked.set(code, new Set());
    return session;
  }

  /** Records that `catalogueId` was unlocked by a typed activation key this session (the sticky slice, §13 S4). */
  recordKeyUnlock(code: string, catalogueId: string): void {
    const key = code.toUpperCase();
    if (!this.keyUnlocked.has(key)) this.keyUnlocked.set(key, new Set());
    this.keyUnlocked.get(key)!.add(catalogueId);
  }

  /** The key-typed unlock slice for a session (survives host change). */
  keyUnlockedIds(code: string): string[] {
    return [...(this.keyUnlocked.get(code.toUpperCase()) ?? [])];
  }

  /**
   * Join codes are generated uppercase-only (generateJoinCode), but the
   * client's entry box only visually uppercases input via CSS
   * (text-transform), not the underlying typed value — a code typed in
   * lowercase or mixed case previously failed to find its session even
   * though it was displayed correctly. Normalizing the lookup here (the
   * single source of truth for code matching, constitution Principle I)
   * fixes this regardless of what case any caller sends.
   */
  get(code: string): Session | undefined {
    return this.sessions.get(code.toUpperCase());
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

  /** Starts the empty-session idle-TTL timer if the session has no connected participants. */
  markPossiblyEmpty(code: string): void {
    const session = this.sessions.get(code);
    if (!session) return;
    const hasConnected = session.participants.some((p) => p.connectionStatus === 'connected');
    if (hasConnected || this.graceTimers.has(code)) return;

    const timer = setTimeout(() => {
      this.sessions.delete(code);
      this.keyUnlocked.delete(code);
      this.graceTimers.delete(code);
    }, this.sessionEmptyTtlMs);
    this.graceTimers.set(code, timer);
  }

  /**
   * Starts the host-succession grace timer (infrastructure.md Host
   * Succession) — a no-op if one is already pending for this session, so
   * the host disconnecting twice in a row doesn't reset the clock.
   */
  scheduleHostReassignment(code: string, onGraceExpired: () => void): void {
    if (this.hostReassignTimers.has(code)) return;
    const timer = setTimeout(() => {
      this.hostReassignTimers.delete(code);
      onGraceExpired();
    }, this.hostReassignGraceMs);
    this.hostReassignTimers.set(code, timer);
  }

  /** Cancels a pending host-succession timer — the host reconnected within the grace period. */
  cancelHostReassignment(code: string): void {
    const timer = this.hostReassignTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.hostReassignTimers.delete(code);
    }
  }
}
