---
status: approved
branch: defects-followup
created: 2026-07-05
features: []
---

# Plan: DEFECTS.md follow-ups (host-remove-participant UI, doc-wording fixes)

## Goal

Close out the four non-CI-related findings from the 2026-07-05 full
`/ardd-verify` pass: finish the client UI for the already-implemented
`host-remove-participant` server message, and fix three artifact-wording
inaccuracies (`pipeline.md`'s lrclib-assisted-line-break description,
`infrastructure.md`'s percussion-detection description, and
`infrastructure.md`'s missing small-screen render-scaling mention).

## Scope

**In scope:**
- A host-only "Remove" control in the Participants tab of the settings
  modal, wired to the existing `host-remove-participant` message.
- Client-side handling for a participant who has just been removed: detect
  it from the ordinary `session-state` broadcast (no new message type —
  consistent with constitution Principle I's shared-broadcast-state
  pattern and this codebase's existing view-transition inference in
  `ws-client.ts`), reset to the Landing view, clear the persisted session
  identity so a refresh doesn't try to rejoin as a removed participant,
  show a toast, and stop that client's own reconnect loop.
- `ui.md`, `infrastructure.md` updates documenting the new control and
  fixing the two wording inaccuracies.
- `pipeline.md` wording fix for the lrclib-assisted-line-break branch.

**Out of scope:**
- Any change to the server handler itself (`host-remove-participant.ts`) —
  it already does the right thing (host-only, filters the participant,
  broadcasts `session-state`); no server changes are needed for the
  client to infer removal from that broadcast.
- A confirmation dialog before removing — matches this app's existing
  terse-host-action pattern (`host-delegate` also has no confirmation,
  per `ui.md`'s Participants tab).
- The constitution Principle VIII CI-provider decision (DEFECTS.md's 5th
  finding) — unrelated, already tracked as its own open question, not
  part of this plan.
- The `lyrics-ticker-font-size` CSS change itself — that's
  `plan-lyrics-ticker-font-size-2026-07-05.md`, a separate plan on its own
  `lyrics-ticker-font-size` branch; this plan doesn't touch `motifs.css`'s
  font-size.

## Technical Approach

**Remove button**: `SettingsModal.svelte`'s Participants tab already
renders a `{#if isHost && !isSelf}` block for "Make host"
(`SettingsModal.svelte:101-103`). Add a "Remove" `Button` in the same
block, calling a new `removeParticipant(p.id)` function that sends
`{ type: 'host-remove-participant', participantId }` — the same
authorization pattern `delegateHost`/`requestHost` already use
(`SettingsModal.svelte:66-72`). No confirmation dialog, no local
optimistic update — the participant list already updates for everyone the
moment the resulting `session-state` broadcast arrives (existing pattern,
per `ui.md`'s Participants tab bullet).

**Self-removal detection**: `ws-client.ts`'s `message.type === 'session-state'`
branch (`ws-client.ts:75-89`) is the one place every session-state update
passes through (already the mechanism driving view transitions). Add a
check there: if `message.selfParticipantId` is set and the current store's
`selfParticipantId` is *also* still set (idempotency guard — only fires
once, since the reset below clears it) but
`message.session.participants` no longer contains an entry with that id,
this client was just removed. This works with zero server changes because
`ConnectionRegistry.broadcast` (`connections.ts:35-41`) still sends the
removed participant's own socket a `session-state` built from its own
still-attached `conn.participantId` — it just won't find itself in the
participant list anymore.

On detection:
- Push a toast via the existing `toastStore` ("You were removed from the
  session by the host") — same mechanism `ws-client.ts` already uses for
  `error` messages (`ws-client.ts:92-95`).
- Clear the persisted session identity via `clearStoredSession()`
  (`session-persistence.ts`, already imported by `leave-session.ts`) so a
  later refresh doesn't try to reclaim-by-id into a session this
  participant no longer belongs to.
- Reset `clientStore` to the same initial shape `leaveSession()` uses
  (`leave-session.ts:15-24`) — landing view, null session/selfParticipantId,
  empty catalog.
- Close this client's own socket and suppress its reconnect: add a local
  `suppressReconnect` flag in `createWsClient`'s closure, set it true here,
  and check it in the existing `'close'` listener
  (`ws-client.ts:68-71`) before calling `setTimeout(attachSocket, ...)` —
  reusing the existing reconnect machinery's shutoff switch rather than a
  second reconnect-control mechanism. Do **not** call `leaveSession()`
  directly from inside this handler — it calls `wsClient?.close()`, which
  would re-enter the same `'close'` listener from within its own message
  handler; doing the reset inline here (mirroring, not calling,
  `leaveSession`'s reset shape) avoids that reentrancy.

**Artifact wording fixes** (mechanical, no design decisions):
- `pipeline.md`: reword the lrclib-assisted-line-break branch to say
  lrclib supplies the lyric *text* in that branch, GP supplies only
  timestamps and line-break counts (matches `extract-lyrics.ts:59-62`,
  `lrc-writer.ts:17-35`).
- `infrastructure.md`: reword the percussion-detection description to say
  `track.isPercussion` (matches `tab-renderer.ts:106`); add a short mention
  of the small-screen render-scale (`tabScaleForViewportWidth`,
  `tab-renderer.ts:59-62`) to the same Tab Rendering section.
- `infrastructure.md`: add a short subsection near Host Transfer/Host
  Succession documenting `host-remove-participant` — host-only, filters
  the target from `Session.participants`, broadcasts `session-state`
  normally (no separate message), and the client-side self-removal
  handling described above.
- `ui.md`: document the new "Remove" control in the Participants tab
  bullet list (host-only, non-self rows, alongside "Make host"), and add a
  short entry under States for "Removed from session" (toast + reset to
  Landing).

## Phase Breakdown

### Phase 1 — Remove-participant control (client)
- [ ] Add a "Remove" button to `SettingsModal.svelte`'s Participants tab,
  host-only, non-self rows, sending `host-remove-participant`.
  (feedback: `feedback-defects-followup-743b.md`)
- [ ] Extend `SettingsModal.ct.spec.ts` to cover: the button only renders
  for the host on other participants' rows, and clicking it sends the
  right message.

### Phase 2 — Self-removal handling (client)
- [ ] Add the self-removal detection branch to `ws-client.ts`'s
  `session-state` handler, with the `suppressReconnect` flag wired into
  the `'close'` listener. (feedback: `feedback-defects-followup-743b.md`)
- [ ] Unit test mirroring `leave-session.test.ts`'s pattern: simulate a
  `session-state` message missing the current participant, assert the
  toast fires, storage is cleared, `clientStore` resets to landing, and
  the socket's `close()` is called without a scheduled reconnect.

### Phase 3 — Artifact updates
- [ ] `ui.md`: document the Remove control and the "Removed from session"
  state. [artifacts: ui]
- [ ] `infrastructure.md`: add the `host-remove-participant`
  subsection; fix the percussion-detection wording; add the
  small-screen render-scale mention. [artifacts: infrastructure]
- [ ] `pipeline.md`: fix the lrclib-assisted-line-break wording.
  [artifacts: pipeline]

### Phase 4 — Verification
- [ ] Manually verify in a real browser with two clients: host removes a
  member, the member sees the toast and lands back on the Landing view,
  and does not silently reconnect into the same session.
- [ ] Run the full test suite (server + client vitest, CT, e2e) before
  merging.

## Complexity Tracking

None — no new principle deviations. Self-removal detection reuses the
existing shared-broadcast-state pattern (Principle I) rather than adding a
side-channel message; the reconnect-suppression flag reuses the existing
reconnect machinery in `ws-client.ts` rather than building a second one.

## Open Questions

None blocking — the one real open question (finish UI vs. remove handler
vs. document as server-only) was resolved by the user before drafting this
plan: finish the UI.

## Production Annotation Summary

None — no production shortcuts introduced. This closes a gap (unreachable
server feature) rather than opening one.
