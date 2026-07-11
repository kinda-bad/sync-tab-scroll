---
status: planned
created: 2026-07-11
plan: plan-catalog-loader-dotfile-guard-2026-07-11.md
---

# Feedback

Found by inspecting the live Railway deployment
(https://sync-tab-scroll.up.railway.app) right after populating the catalog
volume. The client is served as a Vite **production build** by the server
(not the `pnpm dev` client), which is the key difference from any prior
local testing.

Both symptoms below share ONE confirmed root cause (diagnosed 2026-07-11).

## Bugs

- [x] F001 Selecting a song in the deployed app does not render its tab.
      [artifacts: infrastructure]
- [x] F002 Pressing Start shows "Loading tab…" indefinitely; playback never
      begins (deployed only). [artifacts: infrastructure]

## Root cause (CONFIRMED — not the "prod-build worker 404" first suspected)

All alphaTab assets on prod serve HTTP 200 (worker `/alphaTab.worker.js`,
`/assets/alphaTab.worker.mjs`, `/soundfont/sonivox.sf2`, `/font/Bravura.woff2`)
— the prod-build worker issue is NOT present.

The real cause is **macOS AppleDouble (`._*`) sidecar files polluting the
Railway volume.** The catalog was transferred with macOS `tar`, which encoded
each file's `com.apple.provenance` xattr as a `._<name>` companion (the
`LIBARCHIVE.xattr…provenance` warnings during transfer). So the volume holds
e.g. both `Muse-Supermassive Black Hole-07-11-2026.gp` (42 KB, real) and
`._Muse-Supermassive Black Hole-07-11-2026.gp` (163 B, an xattr blob).

`server/src/catalog-loader.ts` `loadSong()` selects the tab file with
`fs.readdirSync(songDir).find((f) => f.endsWith('.gp'))`. The `._`-prefixed
name sorts/enumerates first and also ends in `.gp`, so the server publishes
the 163-byte AppleDouble blob as `gpFilePath`. alphaTab fetches it (HTTP 200)
and can't parse it as a GP score → the tab never renders (F001) and readiness
(`scoreLoaded`) never fires so "Loading tab…" hangs forever (F002). meta.json
/ lyrics.lrc / consent.json load fine because they're read by exact filename,
not a `.find()` glob — which is why the songs still appear in the picker.

Local `catalog/` has ZERO `._*` files, which is why local works and only the
deployment is broken. This is deployment-data-specific, not app logic.

## Fix (three parts)

- **[data — immediate]** Remove the AppleDouble files from the volume and
  restart: `railway ssh "find /data/catalog -name '._*' -delete"` then
  `railway redeploy -y` (the server only scans the catalog at startup). No
  code change needed to unblock the live app — the real `.gp` is already
  present and will be selected once the `._` twin is gone.
- **[code — hardening, test-first per constitution VII] [artifacts:
  infrastructure]** Make `loadSong()`'s `.gp` selection ignore dotfiles /
  AppleDouble sidecars (e.g. `f.endsWith('.gp') && !f.startsWith('._')`, or
  skip any `.`-prefixed name). Prevents this whole class of bug regardless of
  how files arrive; matches infrastructure.md's "malformed entry is skipped,
  not fatal" robustness intent.
- **[runbook — prevent recurrence]** Document/use an AppleDouble-free
  transfer: `COPYFILE_DISABLE=1 tar czf - -C catalog .` (or `--no-mac-metadata`
  / `--exclude='._*'`) so macOS never emits the `._*` sidecars. Belongs in
  the README's Railway populate steps.
