import * as at from '@coderline/alphatab';
import type { FlatSyncPoint } from '@sync-tab-scroll/shared';
import { darkTabColors, lightTabColors, cyberpunkDarkTabColors, cyberpunkLightTabColors } from './brand-colors';
import { tabScaleForViewportWidth } from './tab-scale';

export type Theme = 'dark' | 'light' | 'cyberpunk-dark' | 'cyberpunk-light';

export interface TabRendererOptions {
  container: HTMLElement;
  gpFilePath: string;
  trackIndex: number;
  theme?: Theme;
  /**
   * Selects the audio engine (infrastructure.md, datamodel.md
   * Session.playbackSource). Omitted → the shipped synth path, byte-for-byte
   * unchanged. `PlayerMode.EnabledBackingTrack` → recording mode, which loads no
   * sound font and instead plays `recordingPath` as the score's backing track,
   * anchored to the notation by `syncPoints` (both required in that mode).
   */
  playerMode?: at.PlayerMode;
  /** Client-fetchable URL of the recording mp3; used only in backing-track mode. */
  recordingPath?: string;
  /** Tick↔recording-time anchors applied via `Score.applyFlatSyncPoints()`; used only in backing-track mode. */
  syncPoints?: FlatSyncPoint[];
  /**
   * Effective bars-per-row pin at construction (host-mandated-bars-per-row-
   * layout): `Session.hostBarsPerRow` when the host has pinned a layout,
   * falling back to the participant's own personal preference otherwise;
   * `null`/omitted means alphaTab's native auto-wrap.
   */
  barsPerRow?: number | null;
}

function applyThemeColors(resources: at.RenderingResources, theme: Theme): void {
  const colors = {
    dark: darkTabColors,
    light: lightTabColors,
    'cyberpunk-dark': cyberpunkDarkTabColors,
    'cyberpunk-light': cyberpunkLightTabColors,
  }[theme];
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
export function createTabRenderer({ container, gpFilePath, trackIndex, theme = 'dark', playerMode, recordingPath, syncPoints, barsPerRow }: TabRendererOptions): at.AlphaTabApi {
  const recording = playerMode === at.PlayerMode.EnabledBackingTrack;
  const settings = new at.Settings();
  settings.core.engine = 'svg';
  settings.core.fontDirectory = '/font/';
  // NOT the mechanism that keeps the audio player worker alive (defect
  // bf07f912 — a previous version of this comment claimed it was; corrected
  // per infrastructure.md's Font & Worker Setup section). alphaTab's ESM
  // build always attempts `new Worker(new URL('./alphaTab.worker.mjs',
  // import.meta.url), {type: 'module'})` first, in every environment; that
  // request resolves via Vite's dev-time `/@fs/` passthrough or, in a
  // production build, the `alphaTabWorkerAssets()` vite plugin emitting the
  // asset (see vite.config.ts). This `core.scriptFile` line is only a
  // fallback reached inside a `catch` for a *synchronous* Worker-construction
  // error — a Worker pointed at a hanging or 404ing URL never throws
  // synchronously, so this line does nothing to rescue that failure mode.
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
  // Host-mandated bars-per-row layout (host-mandated-bars-per-row-layout):
  // pins alphaTab's native display.barsPerRow when set (host pin or the
  // participant's own personal preference, resolved by the caller);
  // omitted/null leaves alphaTab's own auto-wrap behavior unchanged.
  if (barsPerRow != null) settings.display.barsPerRow = barsPerRow;

  applyThemeColors(settings.display.resources, theme);

  // alphaTab is the audio engine (ui.md) — the SoundFont is a real,
  // multi-MB asset the client loads (infrastructure.md); using the
  // Apache-2.0-licensed Sonivox soundfont alphaTab ships, rather than
  // sourcing/licensing a separate one.
  settings.player.enablePlayer = true;
  if (recording) {
    // Recording mode plays the operator's mp3 as a backing track — alphaTab
    // cannot mix synth with a backing track (upstream #1961), so no sound font
    // is loaded here (readiness.ts keys mode-aware off this, T014).
    settings.player.playerMode = at.PlayerMode.EnabledBackingTrack;
  } else {
    settings.player.soundFont = '/soundfont/sonivox.sf2';
  }

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
    // In recording mode, anchor the score to the recording's timeline via
    // alphaTab's own applyFlatSyncPoints (datamodel.md, infrastructure.md) —
    // applied here at scoreLoaded, before playback can begin.
    if (recording && syncPoints && syncPoints.length > 0) score.applyFlatSyncPoints(syncPoints);
    const track = score.tracks[trackIndex];
    const isPercussion = track.isPercussion;
    api.settings.display.staveProfile = isPercussion ? at.StaveProfile.Score : at.StaveProfile.TabMixed;
    // TabRhythmMode.Automatic silently falls through to Hidden for TabMixed — must be explicit.
    if (!isPercussion) api.settings.notation.rhythmMode = at.TabRhythmMode.ShowWithBars;
    api.updateSettings();
    api.render();
  });

  if (recording) {
    // Load the score ourselves so the mp3 can be attached as the backing track
    // before it reaches the player (mirrors RecordingDriftHarness's proven
    // idiom): api.load() offers no hook to set score.backingTrack pre-load.
    Promise.all([
      fetch(gpFilePath).then((res) => res.arrayBuffer()),
      fetch(recordingPath!).then((res) => res.arrayBuffer()),
    ]).then(([gpBuffer, mp3Buffer]) => {
      const score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(gpBuffer), settings);
      score.backingTrack = new at.model.BackingTrack();
      score.backingTrack.rawAudioFile = new Uint8Array(mp3Buffer);
      api.renderScore(score, [trackIndex]);
    });
  } else {
    fetch(gpFilePath)
      .then((res) => res.arrayBuffer())
      .then((buffer) => api.load(new Uint8Array(buffer), [trackIndex]));
  }

  return api;
}

/** Toggles theme at runtime (no reload) — re-renders with the new resource colors, since alphaTab's colors are SVG fill attributes, not CSS-inherited. */
export function setTheme(api: at.AlphaTabApi, theme: Theme): void {
  applyThemeColors(api.settings.display.resources, theme);
  api.updateSettings();
  api.render();
}

/**
 * Switches which track alphaTab renders/plays without reloading the GP file
 * or recreating the api instance — used when a participant changes their
 * selected instrument part mid-session (previously a no-op: the engine was
 * created once and never updated on a later part-select, so the pink
 * "selected" state in the part picker changed but the rendered tab never
 * did). Mirrors the staveProfile/rhythmMode setup `createTabRenderer`'s own
 * `scoreLoaded` handler applies for the initial track.
 */
export function switchTrack(api: at.AlphaTabApi, score: at.model.Score, trackIndex: number): void {
  const track = score.tracks[trackIndex];
  const isPercussion = track.isPercussion;
  api.settings.display.staveProfile = isPercussion ? at.StaveProfile.Score : at.StaveProfile.TabMixed;
  if (!isPercussion) api.settings.notation.rhythmMode = at.TabRhythmMode.ShowWithBars;
  api.updateSettings();
  api.renderTracks([track]);
}
