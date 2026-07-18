import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';
import { readRawLyricsLine } from './line-breaks.js';

function makeGp(gpif: string): string {
  const zip = new AdmZip();
  zip.addFile('Content/score.gpif', Buffer.from(gpif, 'utf8'));
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rawline-')), 'song.gp');
  zip.writeZip(file);
  return file;
}

const gpifWith = (tracksXml: string) => `<GPIF><Tracks>${tracksXml}</Tracks></GPIF>`;

describe('readRawLyricsLine', () => {
  it('returns the raw track-level lyric line text for the given track', () => {
    const gp = makeGp(
      gpifWith(
        `<Track><Name>Guitar</Name></Track>` +
          `<Track><Name>Vocals</Name><Lyrics dispatched="true"><Line><Text><![CDATA[Time is run-ning out]]></Text><Offset>0</Offset></Line></Lyrics></Track>`,
      ),
    );
    expect(readRawLyricsLine(gp, 1)).toEqual({ text: 'Time is run-ning out', startBar: 0 });
  });

  it('carries a non-zero start-bar offset', () => {
    const gp = makeGp(
      gpifWith(
        `<Track><Lyrics dispatched="true"><Line><Text><![CDATA[la la]]></Text><Offset>4</Offset></Line></Lyrics></Track>`,
      ),
    );
    expect(readRawLyricsLine(gp, 0)).toEqual({ text: 'la la', startBar: 4 });
  });

  it('returns null when the track has no track-level lyric line', () => {
    const gp = makeGp(gpifWith(`<Track><Name>Guitar</Name></Track>`));
    expect(readRawLyricsLine(gp, 0)).toBeNull();
  });

  it('returns null for an empty lyric line', () => {
    const gp = makeGp(
      gpifWith(`<Track><Lyrics dispatched="true"><Line><Text><![CDATA[]]></Text></Line></Lyrics></Track>`),
    );
    expect(readRawLyricsLine(gp, 0)).toBeNull();
  });
});

// Real catalog content is gitignored; skip when absent (e.g. CI).
const TIRO_GP = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../catalog/kinda-bad/muse-time-is-running-out/Muse-Time Is Running Out-06-16-2026.gp',
);

describe.skipIf(!fs.existsSync(TIRO_GP))('readRawLyricsLine on the real TIRO file', () => {
  it('extracts the vocals track raw line at offset 0', () => {
    const raw = readRawLyricsLine(TIRO_GP, 1);
    expect(raw).not.toBeNull();
    expect(raw!.startBar).toBe(0);
    expect(raw!.text).toContain('bu-ry it');
    expect(raw!.text.length).toBeGreaterThan(500);
  });
});
