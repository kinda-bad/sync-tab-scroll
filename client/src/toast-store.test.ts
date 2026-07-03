import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { toastStore } from './toast-store';

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('push appends a toast with an incrementing id', () => {
    const before = get(toastStore).length;
    toastStore.push('first');
    toastStore.push('second');
    const toasts = get(toastStore).slice(before);
    expect(toasts.map((t) => t.message)).toEqual(['first', 'second']);
    expect(toasts[1].id).toBeGreaterThan(toasts[0].id);
  });

  it('auto-removes a toast 5000ms after it was pushed', () => {
    toastStore.push('temporary');
    expect(get(toastStore).some((t) => t.message === 'temporary')).toBe(true);

    vi.advanceTimersByTime(5000);

    expect(get(toastStore).some((t) => t.message === 'temporary')).toBe(false);
  });
});
