// Playwright component-test mount page entry point. Loads the same
// global stylesheets main.ts does — needed so CSS-only fixes (e.g. the
// alphaTab cursor coloring in motifs.css) are actually exercised in CT
// tests, not just in the real app's own bootstrap.
import '../src/styles/tokens.css';
import '../src/styles/motifs.css';
