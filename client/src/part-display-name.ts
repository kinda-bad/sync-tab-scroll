/**
 * Part-name extraction (feedback part-name-instrument-ux F001, ui.md):
 * pure module — no framework imports — mapping a song's raw GP part names
 * (in track order) to `{instrument, detail}` display pairs.
 *
 * T001 red-state stub: implemented by T002.
 */
export interface PartDisplayName {
  instrument: string;
  detail: string | null;
}

export function partDisplayNames(_rawNames: string[]): PartDisplayName[] {
  throw new Error('not implemented (T002)');
}
