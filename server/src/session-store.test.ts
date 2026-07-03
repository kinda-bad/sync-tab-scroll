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
    expect(session.metronomeEnabled).toBe(false);
    expect(session.lobbyCursorTick).toBeNull();
    expect(session.spotlightMode).toBe(false);
    expect(session.playbackState).toMatchObject({ status: 'stopped', tickPosition: 0, bpm: 120 });
  });

  it('never produces two sessions with the same code', () => {
    const store = new SessionStore();
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) codes.add(store.create(`host-${i}`).code);
    expect(codes.size).toBe(50);
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
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });

    store.markPossiblyEmpty(session.code);
    vi.advanceTimersByTime(30_000);

    expect(store.get(session.code)).toBeUndefined();
  });

  it('markPossiblyEmpty does not schedule destruction when a participant is connected', () => {
    const store = new SessionStore();
    const session = store.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'connected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });

    store.markPossiblyEmpty(session.code);
    vi.advanceTimersByTime(30_000);

    expect(store.get(session.code)).toBeDefined();
  });

  it('markActive cancels a pending destruction timer', () => {
    const store = new SessionStore();
    const session = store.create('host-1');
    session.participants.push({ id: 'host-1', displayName: 'Host', role: 'host', connectionStatus: 'disconnected', selectedPart: null, readiness: 'no-part', joinedAt: 0 });

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
