import * as at from '@coderline/alphatab';
import { darkTabColors, lightTabColors } from './brand-colors';
import { tabScaleForViewportWidth } from './tab-scale';

export type Theme = 'dark' | 'light';

export interface TabRendererOptions {
  container: HTMLElement;
  gpFilePath: string;
  trackIndex: number;
  theme?: Theme;
}

function applyThemeColors(resources: at.RenderingResources, theme: Theme): void {
  const colors = theme === 'dark' ? darkTabColors : lightTabColors;
  resources.mainGlyphColor = colors.foreground; // flat full-brightness — see class doc comment below
  resources.secondaryGlyphColor = colors.foregroundDim;
  resources.staffLineColor = colors.rulingDim;
  resources.barSeparatorColor = colors.rulingMid;
  resources.barNumberColor = colors.foregroundDim;
  resources.scoreInfoColor = colors.foregroundDim;
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
 *
 * Light-mode values (brand.md) are a first pass, not production-validated
 * like dark mode's harvested values — expect a future visual QA pass.
 */
export function createTabRenderer({ container, gpFilePath, trackIndex, theme = 'dark' }: TabRendererOptions): at.AlphaTabApi {
  const settings = new at.Settings();
  settings.core.engine = 'svg';
  settings.core.fontDirectory = '/font/';
  // alphaTab's audio player spawns its own worker independent of
  // core.useWorkers (which only controls the render worker) and needs a
  // classic (non-ESM) script it can load — auto-detection fails under
  // Vite's ESM dev/build output, same root cause as the render-worker
  // issue. A classic build copy is served as a static asset for this.
  settings.core.scriptFile = new URL('/alphaTab.worker.js', location.origin).href;
  // Web workers fail to initialize under Vite's ESM dev/build output
  // (alphaTab's worker-script auto-detection assumes a single bundled
  // script file, not ES modules) — verified empirically: render() was a
  // silent no-op with workers enabled, worked immediately with them off.
  settings.core.useWorkers = false;
  settings.display.layoutMode = at.LayoutMode.Page;
  // Phone screens get a larger render scale so notation is legible without
  // pinch-zoom (see tab-scale.ts) — Page layout re-wraps bars to the
  // container, so this can't introduce horizontal overflow.
  settings.display.scale = tabScaleForViewportWidth(window.innerWidth);
  // No settings.display.barsPerRow pin — auto-wrap by default (someday:
  // host-mandated bars-per-row and participant-preferred horizontal layout
  // are deferred future direction, not built now).

  applyThemeColors(settings.display.resources, theme);

  // alphaTab is the audio engine (ui.md) — the SoundFont is a real,
  // multi-MB asset the client loads (infrastructure.md); using the
  // Apache-2.0-licensed Sonivox soundfont alphaTab ships, rather than
  // sourcing/licensing a separate one.
  settings.player.enablePlayer = true;
  settings.player.soundFont = '/soundfont/sonivox.sf2';

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

  api.error.on((e) => console.error('[tab-renderer] error', e));

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

/** Toggles theme at runtime (no reload) — re-renders with the new resource colors, since alphaTab's colors are SVG fill attributes, not CSS-inherited. */
export function setTheme(api: at.AlphaTabApi, theme: Theme): void {
  applyThemeColors(api.settings.display.resources, theme);
  api.updateSettings();
  api.render();
}
