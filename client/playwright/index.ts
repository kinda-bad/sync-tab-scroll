// Playwright component-test mount page entry point. Loads the same
// global stylesheets main.ts does — needed so CSS-only fixes (e.g. the
// alphaTab cursor coloring in motifs.css) are actually exercised in CT
// tests, not just in the real app's own bootstrap.
import '../src/styles/tokens.css';
import '../src/styles/motifs.css';
// lyrics.css was missing here (tasks-lyrics-only-view-fix-2-c7cf.md T001) —
// its global `.full-lyrics-view` rule is exactly the CSS this bug concerns,
// so a CT test asserting on that class's computed style needs it loaded,
// same as main.ts's own bootstrap does.
import '../src/lyrics.css';
