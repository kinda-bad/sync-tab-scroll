import * as fs from 'node:fs';
import type { RawLyricsLine } from './line-breaks.js';

/**
 * Reads the raw track-level lyric line from a legacy GP3–5 binary file
 * (`FICHIER GUITAR PRO…` header, no zip) — the sibling of line-breaks.ts's
 * gpif-based `readRawLyricsLine` for GP7/8 (pipeline.md "Legacy GP3–5
 * Raw-Line Extraction", `gp5-raw-lyric-line-extraction`).
 *
 * GP4/GP5 layout to the lyrics block (verified empirically against the
 * catalog's Supermassive Black Hole GP5.00 file, T004
 * tasks-widgets-gp5-songswitch-a046.md):
 *   - version: 1 length byte + string, padded to 31 bytes total
 *   - score info: title, subtitle, artist, album, words, music (GP5 only),
 *     copyright, tab author, instructions — each an int32(total)+byte(len)
 *     prefixed string
 *   - notice: int32 line count + that many strings of the same kind
 *   - lyrics block: int32 lyric track number, then five lines of
 *     {int32 start measure, int32 byte length + bytes}
 *
 * Returns line 1's text + start measure, decoded as cp1252 (GP5's text
 * encoding). Returns null — the current no-raw-line fallback — for
 * non-GP3–5 files, GP3 files (whose header layout differs and which carry
 * no words/music split), an empty line 1, or any structural deviation
 * (plan Open Question 3: never force a parse).
 */
export function readGp5RawLyricsLine(gpFilePath: string): RawLyricsLine | null {
  return readGp5RawLyricsLineFromBuffer(fs.readFileSync(gpFilePath));
}

const HEADER = 'FICHIER GUITAR PRO';

export function readGp5RawLyricsLineFromBuffer(buf: Buffer): RawLyricsLine | null {
  try {
    // Legacy binary header: 1 length byte + "FICHIER GUITAR PRO vX.YY".
    if (buf.length < 31) return null;
    const versionLen = buf[0];
    if (versionLen < HEADER.length || 1 + versionLen > 31) return null;
    const version = buf.toString('latin1', 1, 1 + versionLen);
    if (!version.startsWith(HEADER)) return null;

    // GP3 has no lyrics block at all (and a different info layout); only
    // v4/v5 carry one. The version string ends "vN.NN".
    const major = /v(\d+)\./.exec(version)?.[1];
    if (major !== '4' && major !== '5') return null;

    let offset = 31;

    const readIntByteString = (): string | null => {
      if (offset + 5 > buf.length) return null;
      const total = buf.readInt32LE(offset);
      offset += 4;
      const len = buf[offset];
      offset += 1;
      // The int32 is the byte length + 1 (for the length byte itself);
      // treat any other relationship as a structural deviation.
      if (total !== len + 1 || offset + len > buf.length) return null;
      const s = buf.toString('latin1', offset, offset + len);
      offset += len;
      return s;
    };

    // GP4 has 8 info strings (single words/music author); GP5 splits words
    // and music into two, for 9.
    const infoCount = major === '5' ? 9 : 8;
    for (let i = 0; i < infoCount; i++) {
      if (readIntByteString() === null) return null;
    }

    if (offset + 4 > buf.length) return null;
    const noticeLines = buf.readInt32LE(offset);
    offset += 4;
    if (noticeLines < 0 || noticeLines > 1000) return null;
    for (let i = 0; i < noticeLines; i++) {
      if (readIntByteString() === null) return null;
    }

    // GP4 carries a triple-feel byte between the notice and the lyrics
    // block; GP5 does not.
    if (major === '4') offset += 1;

    // Lyrics block: int32 track number, then five {int32 measure,
    // int32 length + bytes} lines. Only line 1 is published.
    if (offset + 4 > buf.length) return null;
    offset += 4; // lyric track number — not needed for the raw line itself

    if (offset + 8 > buf.length) return null;
    const startMeasure = buf.readInt32LE(offset);
    offset += 4;
    const len = buf.readInt32LE(offset);
    offset += 4;
    if (len < 0 || offset + len > buf.length) return null;
    // GP5 text is cp1252; latin1 matches it for all single-byte codepoints
    // except the 0x80–0x9F range, remapped below.
    const text = decodeCp1252(buf.subarray(offset, offset + len));

    if (text.trim().length === 0) return null;
    // GP measures are 1-based; the published startBar field is a 0-based
    // bar offset (matching the gpif <Offset> semantics of line-breaks.ts).
    return { text, startBar: Math.max(0, startMeasure - 1) };
  } catch {
    return null;
  }
}

/** cp1252 differs from latin1 only in 0x80–0x9F, where it maps to printable punctuation/letters instead of C1 controls. */
const CP1252_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

function decodeCp1252(bytes: Buffer): string {
  let out = '';
  for (const b of bytes) {
    out += b >= 0x80 && b <= 0x9f ? (CP1252_HIGH[b] ?? String.fromCharCode(b)) : String.fromCharCode(b);
  }
  return out;
}
