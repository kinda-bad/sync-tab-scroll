import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CatalogPart, CatalogSong, Catalogue, FlatSyncPoint, Session } from '@sync-tab-scroll/shared';
import { hasConsent } from './consent.js';

const DEFAULT_CATALOGUE_ID = 'default';

interface SongMeta {
  name: string;
  artist: string;
  parts: CatalogPart[];
  lyricsTrackIndex: number | null;
  lyricsLineIndex: number | null;
  lyricLineBreaks: number[] | null;
  lyricsRawLine?: string;
  lyricsRawLineStartBar?: number;
  /**
   * Tick↔recording-time anchors authored in alphatab.net's Media Sync Editor,
   * stored verbatim in `meta.json` (datamodel.md FlatSyncPoint, pipeline.md).
   * Absent for a non-recording song; required alongside a `recording.mp3` for the
   * song to be recording-capable (T009).
   */
  syncPoints?: FlatSyncPoint[];
}

/** On-disk `catalogue.json` shape (datamodel.md Catalogue Activation Key) — the raw key material for a private catalogue. */
interface CatalogueRecord {
  name: string;
  salt: string;
  hash: string;
  /** Monotonic key generation (datamodel.md); absent ⇒ treated as `1` (pre-epoch records). */
  epoch?: number;
}

/**
 * A catalogue as held in server memory: the client-safe `Catalogue`
 * (id/name/public) plus, for a private catalogue, the raw `salt`/`hash`
 * key material used to verify `catalogue-unlock` attempts server-side, and the
 * activation-key `epoch` (datamodel.md; §13 S5) a persisted `CatalogueMembership`
 * must match to still grant access. `salt`/`hash`/`epoch` are never sent to any
 * client — `visibleCatalog` strips them before delivery.
 */
export interface LoadedCatalogue extends Catalogue {
  salt?: string;
  hash?: string;
  /** Activation-key epoch (private catalogues only); defaults to 1 when catalogue.json omits it. */
  epoch?: number;
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

  // Recording discovery (T008/T009). The recording is a fixed `recording.mp3`
  // filename — an exact-name lookup inherently excludes a `._recording.mp3`
  // AppleDouble sidecar. A recording is only usable if it is also anchored to
  // the score by `syncPoints`; without anchors it cannot be aligned to the tab
  // at all, so (T009) we treat it as recording-less and warn, naming the song —
  // the same skip-not-fatal posture the loader applies elsewhere.
  const syncPoints = meta.syncPoints ?? null;
  const hasRecording = fs.existsSync(path.join(songDir, 'recording.mp3'));
  let recordingPath: string | null = null;
  if (hasRecording) {
    if (syncPoints) {
      recordingPath = `${urlPrefix}/recording.mp3`;
    } else {
      // T009: an unanchored recording cannot be aligned to the score, so it is
      // treated as recording-less — logged (naming the song), not fatal.
      console.warn(
        `[catalog-loader] song "${path.basename(relPath)}" has a recording.mp3 but no syncPoints in meta.json; treating it as recording-less (an unanchored recording cannot be aligned to the score)`,
      );
    }
  }

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
    lyricsRawLine: meta.lyricsRawLine,
    lyricsRawLineStartBar: meta.lyricsRawLineStartBar,
    recordingPath,
    syncPoints,
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
      catalogue = { id: entry.name, name: record.name ?? entry.name, public: false, salt: record.salt, hash: record.hash, epoch: record.epoch ?? 1 };
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
 * Re-scans `catalogRoot` and reassigns `ctx.catalog` in place (Phase 2 in-app
 * authoring; infrastructure.md "Mutation model"). `HandlerContext.catalog` is
 * built once at `createServer()` at boot; this is what makes it mutable at
 * runtime — called after a successful authoring write (T005) so the in-memory
 * catalog is a **store**, not a build-once snapshot. No behavior change beyond
 * that: this task only makes the re-scan re-invokable post-startup.
 */
export function rescanCatalog(ctx: { catalog: LoadedCatalog }, catalogRoot: string, requireSongConsent = false): void {
  ctx.catalog = loadCatalog(catalogRoot, requireSongConsent);
}

/**
 * Filters the server-global catalogue set down to what a single session may
 * actually receive (infrastructure.md Song Catalog Delivery). A **locked,
 * not-yet-unlocked** private catalogue is withheld **entirely** — not only its
 * songs but its metadata (`id`/`name`) too — so the client never learns it
 * exists (that's what makes the picker hide it, and it's why a `catalogue-unlock`
 * carries only a key, never an id). A public catalogue, and a private catalogue
 * this session has already unlocked, are included; the raw `salt`/`hash` are
 * always stripped, never reaching a client.
 *
 * `ownedCatalogueIds` (Phase 2 in-app authoring; infrastructure.md "Per-user
 * visibility") is the third parameter datamodel.md/infrastructure.md describe
 * as `visibleCatalog(catalog, session, userId)`: a catalogue the requesting
 * participant owns (`CatalogueOwnership`, looked up via the `ownerId` index) is
 * visible to *them* even before anyone has unlocked it. `visibleCatalog` itself
 * stays a pure, synchronous filter — callers resolve `userId`'s owned catalogue
 * ids via `ctx.accountStore.getOwnershipsByOwner(userId)` first (async, same
 * pre-resolve-then-filter shape `membershipDerivedUnlocks` already uses for
 * `unlockedCatalogueIds`) and pass the resulting array in here.
 */
export function visibleCatalog(
  catalog: LoadedCatalog,
  session: Pick<Session, 'unlockedCatalogueIds'>,
  ownedCatalogueIds: string[] = [],
): { catalogues: Catalogue[]; songs: CatalogSong[] } {
  const unlocked = new Set(session.unlockedCatalogueIds);
  const owned = new Set(ownedCatalogueIds);
  const isVisible = (c: LoadedCatalogue): boolean => c.public || unlocked.has(c.id) || owned.has(c.id);

  const catalogues: Catalogue[] = catalog.catalogues
    .filter(isVisible)
    .map(({ id, name, public: isPublic }) => ({ id, name, public: isPublic }));
  const visibleIds = new Set(catalogues.map((c) => c.id));
  const songs = catalog.songs.filter((s) => visibleIds.has(s.catalogueId));

  return { catalogues, songs };
}
