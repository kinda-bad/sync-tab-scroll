import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from './session-store.js';

describe('SessionStore.create', () => {
  it('returns a Session with a 4-character code from the documented charset and all defaults', () => {
    const store = new SessionStore();
    const session = store.create('host-1');

    expect(session.code).toHaveLength(4);
    expect(session.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    expect(session.hostId).toBe('host-1');
    expect(session.selectedSong).toBeNull();
    expect(session.availableParts).toEqual([]);
    expect(session.participants).toEqual([]);
    expect(session.countInEnabled).toBe(false);
    expect(session.lobbyCursorTick).toBeNull();
    expect(session.spotlightMode).toBe(false);
    expect(session.pendingHostRequest).toBeNull();
    expect(session.playbackState).toMatchObject({ status: 'stopped', tickPosition: 0, bpm: 120 });
  });

  it('never produces two sessions with the same code', () => {
    const store = new SessionStore();
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) codes.add(store.create(`host-${i}`).code);
    expect(codes.size).toBe(50);
  });
});

describe('SessionStore.get case-insensitivity', () => {
  it('finds a session regardless of the lookup code\'s case', () => {
    const store = new SessionStore();
    const session = store.create('host-1');

    expect(store.get(session.code.toLowerCase())).toBe(session);
    expect(store.get(session.code.toUpperCase())).toBe(session);
    // Mixed case, e.g. a code like "AB12" typed as "aB12".
    const mixed = session.code
      .split('')
      .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
      .join('');
    expect(store.get(mixed)).toBe(session);
  });
});

describe('SessionStore grace-period timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('markPossiblyEmpty schedules destruction only when no participants are connected', () => {
    const store = new SessionStore();
    const session = store.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});

    store.markPossiblyEmpty(session.code);
    vi.advanceTimersByTime(30_000);

    expect(store.get(session.code)).toBeUndefined();
  });

  it('markPossiblyEmpty does not schedule destruction when a participant is connected', () => {
    const store = new SessionStore();
    const session = store.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});

    store.markPossiblyEmpty(session.code);
    vi.advanceTimersByTime(30_000);

    expect(store.get(session.code)).toBeDefined();
  });

  it.fails('an empty session survives well past 30s and 4h by default (12h TTL)', () => {
    const store = new SessionStore();
    const session = store.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});

    store.markPossiblyEmpty(session.code);
    vi.advanceTimersByTime(30_000);
    expect(store.get(session.code)).toBeDefined();
    vi.advanceTimersByTime(4 * 60 * 60 * 1000);
    expect(store.get(session.code)).toBeDefined();
    // Past the 12h default the session is destroyed.
    vi.advanceTimersByTime(8 * 60 * 60 * 1000);
    expect(store.get(session.code)).toBeUndefined();
  });

  it.fails('destroys an empty session only after the constructor-injected TTL', () => {
    // Cast until the (hostReassignGraceMs, sessionEmptyTtlMs) signature lands (T002).
    const store = new (SessionStore as new (grace?: number, ttl?: number) => SessionStore)(120_000, 5_000);
    const session = store.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});

    store.markPossiblyEmpty(session.code);
    vi.advanceTimersByTime(4_999);
    expect(store.get(session.code)).toBeDefined();
    vi.advanceTimersByTime(1);
    expect(store.get(session.code)).toBeUndefined();
  });

  it('markActive cancels a pending destruction timer', () => {
    const store = new SessionStore();
    const session = store.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 , userId: null});

    store.markPossiblyEmpty(session.code);
    store.markActive(session.code);
    vi.advanceTimersByTime(30_000);

    expect(store.get(session.code)).toBeDefined();
  });
});

describe('SessionStore host-reassignment timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scheduleHostReassignment is a no-op if already pending', () => {
    const store = new SessionStore(1000);
    const session = store.create('host-1');
    let calls = 0;

    store.scheduleHostReassignment(session.code, () => calls++);
    store.scheduleHostReassignment(session.code, () => calls++);

    vi.advanceTimersByTime(1000);

    expect(calls).toBe(1);
  });

  it('cancelHostReassignment clears a pending timer so its callback never fires', () => {
    const store = new SessionStore(1000);
    const session = store.create('host-1');
    let fired = false;

    store.scheduleHostReassignment(session.code, () => {
      fired = true;
    });
    store.cancelHostReassignment(session.code);

    vi.advanceTimersByTime(1000);

    expect(fired).toBe(false);
  });
});
