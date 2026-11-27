import type * as at from '@coderline/alphatab';
import { writable } from 'svelte/store';

/**
 * One played pass of a bar on the playback timeline: a 1-based bar number
 * and the MIDI ticks it spans. A repeated bar appears once per pass.
 */
export interface BarPlay {
  bar: number;
  start: number;
  end: number;
}

/** The loaded song's bars in playback order — what the Settings modal needs to show and take bars instead of raw ticks. */
export interface BarTickMap {
  plays: BarPlay[];
}

/**
 * The bar map of the song this device's engine has loaded, or null before
 * one has loaded (settings-menu-reorganization). The server never parses the
 * score, so bar ↔ tick conversion for the Lobby cursor and the Early stop
 * point happens on the client; the wire stays in ticks. Set by
 * playback-engine.ts, cleared when the engine is torn down.
 */
export const barTickMap = writable<BarTickMap | null>(null);

/** Reads alphaTab's own playback-order lookup (`api.tickCache.masterBars`, repeats already expanded — Principle V). */
export function barTickMapFromLookup(lookup: at.midi.MidiTickLookup): BarTickMap {
  return { plays: lookup.masterBars.map((m) => ({ bar: m.masterBar.index + 1, start: m.start, end: m.end })) };
}

/** Fallback before the MIDI (and so the tick lookup) exists: written bar starts, no repeats expanded. */
export function barTickMapFromScore(score: at.model.Score): BarTickMap {
  return { plays: score.masterBars.map((mb) => ({ bar: mb.index + 1, start: mb.start, end: mb.start + mb.calculateDuration() })) };
}

function firstPass(map: BarTickMap, bar: number): BarPlay | null {
  if (!Number.isInteger(bar)) return null;
  return map.plays.find((p) => p.bar === bar) ?? null;
}

/** Tick where a 1-based bar is first played (same first-pass rule as the start marker), or null for a bar not in the song. */
export function barStartTick(map: BarTickMap, bar: number): number | null {
  return firstPass(map, bar)?.start ?? null;
}

/** Tick where a 1-based bar's first pass ends, or null for a bar not in the song. */
export function barEndTick(map: BarTickMap, bar: number): number | null {
  return firstPass(map, bar)?.end ?? null;
}

/** The 1-based bar playing at a tick; clamped to the first/last bar outside the song, null when there are no bars. */
export function barAtTick(map: BarTickMap, tick: number): number | null {
  const { plays } = map;
  if (plays.length === 0) return null;
  for (const p of plays) if (tick >= p.start && tick < p.end) return p.bar;
  return tick < plays[0].start ? plays[0].bar : plays[plays.length - 1].bar;
}

/** Highest bar number in the song (for the bar inputs' max), or 0 with no bars. */
export function barCount(map: BarTickMap): number {
  return map.plays.reduce((n, p) => Math.max(n, p.bar), 0);
}
