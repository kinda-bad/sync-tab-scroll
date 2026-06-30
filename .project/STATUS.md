# sync-tab-scroll — Project Status

_Updated: 2026-06-30. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | draft ⚠️ | 1 |
| infrastructure.md | draft ⚠️ | 4 |
| datamodel.md | draft ⚠️ | 2 |
| ui.md | draft ⚠️ | 1 |
| brand.md | draft ⚠️ | 5 |

## Open Questions

**constitution**
- Deployment scale/audience — self-hosted/small-group tool, or does it need to handle untrusted public users?

**infrastructure**
- Keep the prior stack (pnpm workspace monorepo, Node + `ws`, Alpine.js) or reconsider any of it?
- Session persistence — server-memory-only (as before), or must sessions survive a server restart?
- Keep Guitar-Pro-as-source-of-truth, `@coderline/alphatab` for rendering, and the lrclib.net lyrics lookup?
- Production hardening (auth, rate limiting) — in scope or out of scope for this rebuild?

**datamodel**
- Any normalization rule changes if the rebuilt pipeline's output format changes from the current LayoutMap shape.
- Indexes/persistence — not yet relevant until storage beyond in-memory is decided.

**ui**
- Keep Alpine.js for client-side reactivity/templating?

**brand**
- Color palette — keep the old dark/neon-accented direction (`neon-yellow`, `neon-blue`) or reset?
- Typography — keep the old display/title font + monospace metadata pairing, or reset?
- Voice & tone for copy (toasts, errors, empty states) — not yet discussed.
- Motion — keep the "glitch" title effect and animated drain/fill bars, or reset?
- Light/dark mode — default mode, and whether both are in scope for the initial rebuild.

## Recommended Next Step

Run `/ardd-analyze` to check cross-artifact consistency, then `/ardd-refine <artifact>` on each draft — starting with `infrastructure` and `ui` since they carry the most open questions (mainly: which parts of the old stack to keep vs. reconsider).
