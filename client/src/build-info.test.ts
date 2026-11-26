import { describe, expect, it } from 'vitest';
import { describeBuild } from './build-info';

describe('describeBuild', () => {
  it('shortens a full commit hash and links to it on GitHub', () => {
    expect(describeBuild('ae9002bcdd7bf539cad7faf566f077051ce0142b')).toEqual({
      label: 'ae9002b',
      url: 'https://github.com/kinda-bad/sync-tab-scroll/commit/ae9002bcdd7bf539cad7faf566f077051ce0142b',
    });
  });

  it('reports a dev build, with no link, when no commit was baked in', () => {
    expect(describeBuild(undefined)).toEqual({ label: 'dev', url: null });
    expect(describeBuild('')).toEqual({ label: 'dev', url: null });
  });

  it('does not build a link from something that is not a commit hash', () => {
    expect(describeBuild('main"><script>')).toEqual({ label: 'dev', url: null });
  });
});
