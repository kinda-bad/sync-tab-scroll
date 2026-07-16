// Package entry point (Phase 2 in-app authoring; infrastructure.md Upload trust
// surface — "reusing the existing extraction pipeline code, not a second
// implementation"). The server's upload route imports the extraction/publish
// functions through here rather than reaching into individual pipeline
// source files directly.
export { extractLyrics } from './extract-lyrics.js';
export { publishSong, slugify } from './catalog.js';
export type { CatalogMeta, CatalogPartMeta } from './catalog.js';
