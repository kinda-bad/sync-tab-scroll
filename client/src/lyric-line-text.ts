import type { CatalogSong } from '@sync-tab-scroll/shared';

/**
 * Turns a raw GP lyric line into readable text (ui.md "Lyrics part
 * selected"): GP's dispatch markup is for placing syllables on beats, not
 * for reading. A `+` is a hold (standalone) or joins two words onto one beat
 * (`I+need`); alphaTab's chunker reads it as a space, and so does this. A `-`
 * splits a word into syllables (`se-cre-t`) and is joined back. The cost: a
 * hyphen the author meant literally is joined too.
 */
export function cleanRawLyricLine(text: string): string {
  return text.replace(/\+/g, ' ').replace(/-/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Whether this song's `.lrc` line text is the raw GP lyric line. The
 * pipeline (extract-lyrics) uses the GP line's own text when the raw lyrics
 * have more than one line; otherwise a tab-sourced song's line text comes
 * from lrclib, and an lrclib-sourced song's always does. lrclib text is
 * already plain, and may carry real hyphens.
 */
function lrcTextIsRawLyricLine(song: Pick<CatalogSong, 'lyricsTrackIndex' | 'lyricsRawLine'>): boolean {
  if (song.lyricsTrackIndex === null || !song.lyricsRawLine) return false;
  return song.lyricsRawLine.split('\n').filter((line) => line.trim().length > 0).length > 1;
}

/** The lyric sheet's text for one `.lrc` line: cleaned of GP markup when it is the raw GP line, as written otherwise. */
export function lyricLineDisplayText(song: Pick<CatalogSong, 'lyricsTrackIndex' | 'lyricsRawLine'>, text: string): string {
  return lrcTextIsRawLyricLine(song) ? cleanRawLyricLine(text) : text;
}
