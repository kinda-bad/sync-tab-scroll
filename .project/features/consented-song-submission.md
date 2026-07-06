---
slug: consented-song-submission
status: implemented
logged: 2026-07-03
plan: plan-consented-song-submission-2026-07-03.md
tasks: tasks-consented-song-submission-0f36.md
---

A submitter can add a `.gp` file to the catalog and explicitly accept a ToS clause granting the operator a license to distribute it publicly; a song is only ever served to clients other than its own submitter once that consent is recorded — local/personal catalog entries (already outside the repo via the gitignored `catalog/` dir) need no such consent and keep working exactly as they do today.
Why: distinguishes "I dropped my own `.gp` files in locally for my band" (already fully supported, no legal exposure) from "this song ships with a public deployment" (requires an affirmative rights claim from whoever submitted it). Open design questions for `/ardd-plan`: whether submission is a web upload form or a CLI drop-in plus a companion consent file, whether consent is recorded per-song or per-submitter, and how this interacts with `pipeline.md`'s current assumption that every catalog song is a pipeline input.
