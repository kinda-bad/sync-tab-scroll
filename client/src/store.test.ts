import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { clientStore } from './store';

describe('clientStore', () => {
  it('defaults connectionStatus to connecting', () => {
    expect(get(clientStore).connectionStatus).toBe('connecting');
  });
});
