import * as at from '@coderline/alphatab';
import { darkTabColors } from './brand-colors';

export interface TabRendererOptions {
  container: HTMLElement;
  gpFilePath: string;
  trackIndex: number;
}

/**
 * Live client-side tab rendering via alphaTab, per infrastructure.md's Tab
 * Rendering section — replaces the old offline SVG pre-render pipeline
 * entirely. Render settings are carried forward verbatim from that
 * artifact; isPercussion is read from the parsed track's own data
 * (constitution Principle V), not stored in the datamodel.
 *
 * mainGlyphColor is one flat color, not the fret-number/geometry 3-way
 * split originally envisioned in brand.md/infrastructure.md — verified
 * empirically that alphaTab's SVG output carries no per-glyph-type CSS
 * classes to target (every glyph is a <text> element from the Bravura
 * font, distinguishable only by its resource-assigned fill, not by any
 * class). Recovering the split would require sniffing each glyph's
 * Bravura codepoint, a fragile mechanism this session chose not to build.
 * This needs a follow-up /ardd-refine brand + infrastructure pass.
 */
export function createTabRenderer({ container, gpFilePath, trackIndex }: TabRendererOptions): at.AlphaTabApi {
  const settings = new at.Settings();
  settings.core.engine = 'svg';
  settings.core.fontDirectory = '/font/';
  // Web workers fail to initialize under Vite's ESM dev/build output
  // (alphaTab's worker-script auto-detection assumes a single bundled
  // script file, not ES modules) — verified empirically: render() was a
  // silent no-op with workers enabled, worked immediately with them off.
  settings.core.useWorkers = false;
  settings.display.layoutMode = at.LayoutMode.Page;
  // No settings.display.barsPerRow pin — auto-wrap by default (someday:
  // host-mandated bars-per-row and participant-preferred horizontal layout
  // are deferred future direction, not built now).

  const r = settings.display.resources;
  r.mainGlyphColor = darkTabColors.foreground; // flat full-brightness — see class doc comment above
  r.secondaryGlyphColor = darkTabColors.foregroundDim;
  r.staffLineColor = darkTabColors.rulingDim;
  r.barSeparatorColor = darkTabColors.rulingMid;
  r.barNumberColor = darkTabColors.foregroundDim;
  r.scoreInfoColor = darkTabColors.foregroundDim;

  // Hide score header fields — the app renders title/artist/part in HTML.
  // Keep EffectMarker (section labels); suppress free text annotations and
  // EffectTempo (tempo is shown in the app's own transport UI, not inline
  // in the score).
  const NE = at.NotationElement;
  for (const el of [
    NE.ScoreTitle,
    NE.ScoreSubTitle,
    NE.ScoreArtist,
    NE.ScoreAlbum,
    NE.ScoreWords,
    NE.ScoreMusic,
    NE.ScoreWordsAndMusic,
    NE.ScoreCopyright,
    NE.GuitarTuning,
    NE.TrackNames,
    NE.EffectText,
    NE.EffectLetRing,
    NE.EffectTempo,
    NE.EffectPalmMute,
  ]) {
    settings.notation.elements.set(el, false);
  }

  const api = new at.AlphaTabApi(container, settings);

  api.scoreLoaded.on((score) => {
    const track = score.tracks[trackIndex];
    const isPercussion = track.isPercussion;
    api.settings.display.staveProfile = isPercussion ? at.StaveProfile.Score : at.StaveProfile.TabMixed;
    // TabRhythmMode.Automatic silently falls through to Hidden for TabMixed — must be explicit.
    if (!isPercussion) api.settings.notation.rhythmMode = at.TabRhythmMode.ShowWithBars;
    api.updateSettings();
    api.render();
  });

  fetch(gpFilePath)
    .then((res) => res.arrayBuffer())
    .then((buffer) => api.load(new Uint8Array(buffer), [trackIndex]));

  return api;
}
