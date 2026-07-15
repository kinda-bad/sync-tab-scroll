import { describe, expect, it } from 'vitest';
import { setEngineTrackMute } from './playback-engine';

/**
 * T002 (tasks-part-mute-toggle-f0d4.md): setEngineTrackMute must no-op
 * safely (not throw) when no engine has ever been created — module-level
 * `state` in playback-engine.ts starts `undefined` and this module is
 * imported fresh here, before any ensurePlaybackEngine() call. The
 * "engine exists but score hasn't loaded" and "mutes the matching loaded
 * track" cases need a real alphaTab instance and are covered by
 * playback-engine.ct.spec.ts instead.
 */
describe('setEngineTrackMute (no engine yet)', () => {
  it('does not throw when no engine exists', () => {
    expect(() => setEngineTrackMute(0, true)).not.toThrow();
  });
});
