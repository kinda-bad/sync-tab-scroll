import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CatalogPart, CatalogSong, Catalogue, Session } from '@sync-tab-scroll/shared';
import { hasConsent } from './consent.js';

const DEFAULT_CATALOGUE_ID = 'default';

interface SongMeta {
  name: string;
  artist: string;
  parts: CatalogPart[];
  lyricsTrackIndex: number | null;
  lyricsLineIndex: number | null;
  lyricLineBreaks: number[] | null;
}

/** On-disk `catalogue.json` shape (datamodel.md Catalogue Activation Key) — the raw key material for a private catalogue. */
interface CatalogueRecord {
  name: string;
  salt: string;
  hash: string;
}

/**
 * A catalogue as held in server memory: the client-safe `Catalogue`
 * (id/name/public) plus, for a private catalogue, the raw `salt`/`hash`
 * key material used to verify `catalogue-unlock` attempts server-side.
 * `salt`/`hash` are never sent to any client (datamodel.md Catalogue
 * Activation Key) — `visibleCatalog` strips them before delivery.
 */
export interface LoadedCatalogue extends Catalogue {
  salt?: string;
  hash?: string;
}

/** What `loadCatalog` returns: the server-global catalogue list plus every loaded song, catalogue-tagged. */
export interface LoadedCatalog {
  catalogues: LoadedCatalogue[];
  songs: CatalogSong[];
}

/**
 * Reads a single song directory (identified by its path relative to
 * `catalogRoot`, e.g. `creep` or `premium-pack/creep`) into a
 * `CatalogSong`. `catalogueId` is the owning catalogue's id. The URL paths
 * published to clients mirror the on-disk relative layout, so a nested
 * catalogue's songs resolve under `/catalog/<catalogue-slug>/<song-slug>/`
 * (infrastructure.md Song Catalog Delivery).
 */
function loadSong(catalogRoot: string, relPath: string, catalogueId: string): CatalogSong {
  const songDir = path.join(catalogRoot, relPath);
  const meta: SongMeta = JSON.parse(fs.readFileSync(path.join(songDir, 'meta.json'), 'utf8'));

  // Ignore dotfiles when picking the tab source: a macOS AppleDouble sidecar
  // (`._<name>.gp`, an xattr blob left by a tar transfer that preserves
  // extended attributes) both ends in `.gp` and sorts ahead of the real
  // file, so a bare `.endsWith('.gp')` would select the unparseable blob.
  const gpFile = fs.readdirSync(songDir).find((f) => f.endsWith('.gp') && !f.startsWith('.'));
  if (!gpFile) throw new Error(`No .gp file found in catalog directory: ${songDir}`);

  const lrcPath = path.join(songDir, 'lyrics.lrc');
  const urlPrefix = `/catalog/${relPath}`;

  return {
    id: path.basename(relPath),
    catalogueId,
    name: meta.name,
    artist: meta.artist,
    gpFilePath: `${urlPrefix}/${gpFile}`,
    parts: meta.parts,
    lyricsLrc: fs.existsSync(lrcPath) ? `${urlPrefix}/lyrics.lrc` : null,
    lyricsTrackIndex: meta.lyricsTrackIndex,
    lyricsLineIndex: meta.lyricsLineIndex,
    lyricLineBreaks: meta.lyricLineBreaks,
  };
}

/** True when `dir` is itself a song directory (has a `meta.json`). */
function isSongDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'meta.json'));
}

/**
 * Loads one song's `CatalogSong`, applying the `requireSongConsent` gate
 * and swallowing/logging a malformed directory rather than throwing —
 * shared by the flat (`default`) and nested (catalogue) scan paths.
 * Returns `null` when the song is skipped.
 */
function tryLoadSong(catalogRoot: string, relPath: string, catalogueId: string, requireSongConsent: boolean): CatalogSong | null {
  const songDir = path.join(catalogRoot, relPath);
  if (requireSongConsent && !hasConsent(songDir)) {
    console.log(`[catalog-loader] skipping "${relPath}": no consent record (REQUIRE_SONG_CONSENT is enabled)`);
    return null;
  }
  try {
    return loadSong(catalogRoot, relPath, catalogueId);
  } catch (err) {
    console.error(`[catalog-loader] skipping malformed catalog directory "${relPath}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Scans `CATALOG_ROOT` at server startup and builds the server-global
 * catalogue set: a list of `Catalogue`s and every song tagged with its
 * `catalogueId`. Two directory layouts are supported, distinguished by
 * marker files rather than names (datamodel.md, infrastructure.md Song
 * Catalog Delivery):
 *
 * - A top-level directory with a `meta.json` is a song in the implicit,
 *   always-public `"default"` catalogue — today's flat
 *   `catalog/<song-slug>/` layout, unchanged and needing no migration.
 * - A top-level directory with a `catalogue.json` is a *private* catalogue;
 *   the record's `salt`/`hash` gate its songs behind an activation key. A
 *   top-level directory with no `catalogue.json` of its own but containing
 *   song subdirectories is a *public* catalogue. Either way its songs live
 *   one level down, at `catalog/<catalogue-slug>/<song-slug>/`.
 *
 * The pipeline is the only writer of this structure (pipeline.md) — the
 * server only reads it. A malformed song directory (missing/invalid
 * meta.json, no .gp file) or catalogue record is logged and skipped rather
 * than thrown, so one bad entry can't take down startup.
 *
 * `requireSongConsent` (infrastructure.md Song Consent Gate, off by
 * default) additionally skips any song directory lacking a valid consent
 * record — logged, not silently dropped, same as any other skip above.
 */
export function loadCatalog(catalogRoot: string, requireSongConsent = false): LoadedCatalog {
  if (!fs.existsSync(catalogRoot)) return { catalogues: [], songs: [] };

  const entries = fs.readdirSync(catalogRoot, { withFileTypes: true }).filter((e) => e.isDirectory());

  const catalogues: LoadedCatalogue[] = [];
  const songs: CatalogSong[] = [];
  let hasDefaultSong = false;

  for (const entry of entries) {
    const entryDir = path.join(catalogRoot, entry.name);

    // A flat song directory (today's layout) belongs to the implicit
    // "default" catalogue.
    if (isSongDir(entryDir)) {
      const song = tryLoadSong(catalogRoot, entry.name, DEFAULT_CATALOGUE_ID, requireSongConsent);
      if (song) {
        songs.push(song);
        hasDefaultSong = true;
      }
      continue;
    }

    const catalogueJsonPath = path.join(entryDir, 'catalogue.json');
    const isPrivate = fs.existsSync(catalogueJsonPath);

    // Otherwise this is a catalogue directory: private if it has a
    // catalogue.json, public if it merely holds song subdirectories.
    const songSubdirs = fs
      .readdirSync(entryDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && isSongDir(path.join(entryDir, e.name)));

    if (!isPrivate && songSubdirs.length === 0) {
      // Neither a song directory, a catalogue.json holder, nor a directory
      // of songs — not something this loader recognizes; skip it quietly.
      continue;
    }

    let catalogue: LoadedCatalogue;
    if (isPrivate) {
      let record: CatalogueRecord;
      try {
        record = JSON.parse(fs.readFileSync(catalogueJsonPath, 'utf8'));
      } catch (err) {
        console.error(`[catalog-loader] skipping catalogue "${entry.name}": malformed catalogue.json:`, err instanceof Error ? err.message : err);
        continue;
      }
      catalogue = { id: entry.name, name: record.name ?? entry.name, public: false, salt: record.salt, hash: record.hash };
    } else {
      catalogue = { id: entry.name, name: entry.name, public: true };
    }
    catalogues.push(catalogue);

    for (const sub of songSubdirs) {
      const song = tryLoadSong(catalogRoot, path.join(entry.name, sub.name), catalogue.id, requireSongConsent);
      if (song) songs.push(song);
    }
  }

  if (hasDefaultSong) {
    catalogues.unshift({ id: DEFAULT_CATALOGUE_ID, name: DEFAULT_CATALOGUE_ID, public: true });
  }

  return { catalogues, songs };
}

/**
 * Filters the server-global catalogue set down to what a single session may
 * actually receive (infrastructure.md Song Catalog Delivery). Every
 * catalogue's client-safe metadata (`id`/`name`/`public`) is always
 * included — a locked catalogue's *name* is still shown in the picker — but
 * the raw `salt`/`hash` are stripped, never reaching a client. A song is
 * included only if its catalogue is public or the session has already
 * unlocked it (`Session.unlockedCatalogueIds`).
 */
export function visibleCatalog(catalog: LoadedCatalog, session: Pick<Session, 'unlockedCatalogueIds'>): { catalogues: Catalogue[]; songs: CatalogSong[] } {
  const unlocked = new Set(session.unlockedCatalogueIds);
  const publicIds = new Set(catalog.catalogues.filter((c) => c.public).map((c) => c.id));

  const catalogues: Catalogue[] = catalog.catalogues.map(({ id, name, public: isPublic }) => ({ id, name, public: isPublic }));
  const songs = catalog.songs.filter((s) => publicIds.has(s.catalogueId) || unlocked.has(s.catalogueId));

  return { catalogues, songs };
}
