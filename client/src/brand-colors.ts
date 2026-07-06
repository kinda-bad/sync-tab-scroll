import * as at from '@coderline/alphatab';

/** Dark-mode tab-notation palette, harvested from the prior app's production CSS (brand.md, Tab Notation & Playback Cursor). */
export const darkTabColors = {
  foreground: new at.model.Color(255, 230, 0, 255), // full-brightness neon-yellow — fret-number text
  foregroundDim: new at.model.Color(255, 230, 0, 102), // dim neon-yellow (0.40 alpha) — default strokes, ghost notes/ties, bar numbers, section labels
  rulingDim: new at.model.Color(0, 207, 255, 102), // dim neon-blue (0.40 alpha) — staff lines
  rulingMid: new at.model.Color(0, 207, 255, 128), // mid neon-blue (0.50 alpha) — barlines
};

/** Light-mode tab-notation palette — proposed, not harvested (brand.md). Lower confidence than dark mode; a first pass to refine visually. */
export const lightTabColors = {
  foreground: new at.model.Color(138, 106, 0, 255), // deep amber-gold — fret-number text
  foregroundDim: new at.model.Color(138, 106, 0, 115), // dim deep amber-gold (0.45 alpha)
  rulingDim: new at.model.Color(0, 114, 168, 115), // deep cyan-blue (0.45 alpha) — staff lines
  rulingMid: new at.model.Color(0, 114, 168, 153), // deep cyan-blue (0.60 alpha) — barlines
};

/** Cyberpunk-dark tab-notation palette — identical to `darkTabColors` (brand.md, Themes: "cyberpunk-dark reuses this section's existing dark-mode table as-is"). */
export const cyberpunkDarkTabColors = darkTabColors;

/** Cyberpunk-light tab-notation palette — fresh design pass, no sync-scroll equivalent (brand.md, Themes), pushing cyan/magenta for a "holographic display" concept. Lower confidence, same caveat as `lightTabColors`. */
export const cyberpunkLightTabColors = {
  foreground: new at.model.Color(0, 183, 221, 255), // deep cyan — fret-number text
  foregroundDim: new at.model.Color(0, 183, 221, 102), // dim deep cyan (0.40 alpha)
  rulingDim: new at.model.Color(214, 0, 107, 89), // magenta (0.35 alpha) — staff lines
  rulingMid: new at.model.Color(214, 0, 107, 128), // magenta (0.50 alpha) — barlines
};
