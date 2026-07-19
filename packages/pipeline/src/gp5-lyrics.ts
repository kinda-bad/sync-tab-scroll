import * as fs from 'node:fs';
import type { RawLyricsLine } from './line-breaks.js';

/** Red-state stub (T004, constitution Principle VII) — full GP5 lyrics-block parse lands on the paired green commit. */
export function readGp5RawLyricsLine(gpFilePath: string): RawLyricsLine | null {
  return readGp5RawLyricsLineFromBuffer(fs.readFileSync(gpFilePath));
}

export function readGp5RawLyricsLineFromBuffer(_buf: Buffer): RawLyricsLine | null {
  return null;
}
