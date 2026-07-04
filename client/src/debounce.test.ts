import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('collapses rapid calls within the window into one invocation, using the last call\'s arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);

    debounced(1);
    debounced(2);
    debounced(3);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('fires each call independently when spaced further apart than the window', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);

    debounced('a');
    vi.advanceTimersByTime(150);
    debounced('b');
    vi.advanceTimersByTime(150);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'a');
    expect(fn).toHaveBeenNthCalledWith(2, 'b');
  });
});
