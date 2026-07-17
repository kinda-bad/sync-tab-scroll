import { describe, expect, it } from 'vitest';
import { parseLrclibLinesWithTimestamps } from './lrclib.js';

describe('parseLrclibLinesWithTimestamps', () => {
  it('parses each line\'s text and its [mm:ss.xx] timestamp converted to milliseconds', () => {
    const synced = '[00:12.340]I\'m a creep\n[00:14.870]I\'m a weirdo\n';

    expect(parseLrclibLinesWithTimestamps(synced)).toEqual([
      { text: "I'm a creep", tickMs: 12340 },
      { text: "I'm a weirdo", tickMs: 14870 },
    ]);
  });

  it('skips blank/whitespace-only lines', () => {
    const synced = '[00:00.000]\n[00:01.500]hello\n\n';

    expect(parseLrclibLinesWithTimestamps(synced)).toEqual([{ text: 'hello', tickMs: 1500 }]);
  });

  it('handles minute values above 0 correctly', () => {
    const synced = '[01:05.250]late line\n';

    expect(parseLrclibLinesWithTimestamps(synced)).toEqual([{ text: 'late line', tickMs: 65250 }]);
  });
});
