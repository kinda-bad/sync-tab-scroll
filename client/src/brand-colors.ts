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
